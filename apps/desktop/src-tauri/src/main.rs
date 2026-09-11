// GUI subsystem in every build: a debug build would otherwise open a stray console window.
// Nothing is lost, the server's output goes to server.log.
#![windows_subsystem = "windows"]

use std::fs::OpenOptions;
use std::io::{BufRead, BufReader};
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{mpsc, Arc, Mutex};
use std::time::Duration;
use tauri::{Manager, Url, WebviewUrl, WebviewWindowBuilder};

struct ServerChild(Arc<Mutex<Option<Child>>>);

/// Stops the local server when Tauri clears its resources, which the updater does right before it
/// quits the app to run the installer; a normal close stops it in the window's Destroyed handler.
struct ServerGuard(Arc<Mutex<Option<Child>>>);

impl tauri::Resource for ServerGuard {}

impl Drop for ServerGuard {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.0.lock() {
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
            }
        }
    }
}

/// Windows gets Helicon's own title bar, drawn by the UI; other platforms keep the native frame.
const CUSTOM_FRAME: bool = cfg!(windows);

/// Tells the UI, before it loads, to draw the window controls and drag regions.
const FRAME_SCRIPT: &str = "window.__HELICON_FRAME__ = 'custom';";

/// Where the server's port is remembered between launches, inside the app's data folder.
const PORT_FILE: &str = "server-port";

/// Shown the instant the window opens, while the local server starts. System colors follow the OS theme.
const SPLASH_PAGE: &str = "data:text/html,<!doctype html><meta charset=utf-8><title>Helicon</title><style>html{color-scheme:light dark;background:Canvas;color:GrayText;font:13px system-ui,sans-serif}body{margin:0;height:100vh;display:grid;place-items:center}</style><body>Starting Helicon</body>";

const MISSING_NODE_PAGE: &str = "data:text/html,<!doctype html><meta charset=utf-8><title>Helicon</title><style>html{color-scheme:light dark;background:Canvas;color:CanvasText;font:14px/1.5 system-ui,sans-serif}body{margin:0;height:100vh;display:grid;place-items:center}main{max-width:420px;padding:24px}p{color:GrayText}</style><main><h1 style=font-size:20px>Helicon needs Node.js</h1><p>Helicon could not start its local server because Node.js 22 or newer was not found. Install Node.js 22 or newer, then open Helicon again.</p></main>";

const MISSING_SERVER_PAGE: &str = "data:text/html,<!doctype html><meta charset=utf-8><title>Helicon</title><style>html{color-scheme:light dark;background:Canvas;color:CanvasText;font:14px/1.5 system-ui,sans-serif}body{margin:0;height:100vh;display:grid;place-items:center}main{max-width:420px;padding:24px}p{color:GrayText}</style><main><h1 style=font-size:20px>Helicon is missing files</h1><p>The bundled Helicon server was not found next to the app. Reinstall Helicon to restore it.</p></main>";

const SERVER_FAILED_PAGE: &str = "data:text/html,<!doctype html><meta charset=utf-8><title>Helicon</title><style>html{color-scheme:light dark;background:Canvas;color:CanvasText;font:14px/1.5 system-ui,sans-serif}body{margin:0;height:100vh;display:grid;place-items:center}main{max-width:420px;padding:24px}p{color:GrayText}</style><main><h1 style=font-size:20px>Helicon could not start</h1><p>Its local server did not come up. The server log in the Helicon app log folder has the details. Close Helicon and open it again to retry.</p></main>";

enum BootError {
    NodeMissing,
    ServerMissing,
    ServerFailed,
}

impl BootError {
    fn page(&self) -> &'static str {
        match self {
            BootError::NodeMissing => MISSING_NODE_PAGE,
            BootError::ServerMissing => MISSING_SERVER_PAGE,
            BootError::ServerFailed => SERVER_FAILED_PAGE,
        }
    }
}

/// Tauri hands out `\\?\` verbatim paths on Windows; Node cannot load a main module from one.
fn plain_path(path: &Path) -> PathBuf {
    let text = path.to_string_lossy();
    if let Some(rest) = text.strip_prefix(r"\\?\UNC\") {
        return PathBuf::from(format!(r"\\{rest}"));
    }
    if let Some(rest) = text.strip_prefix(r"\\?\") {
        return PathBuf::from(rest);
    }
    path.to_path_buf()
}

/// Bundled resources keep their relative path (`resources/server.cjs`); older layouts put them at the root.
fn find_resource(resource_dir: &Path, name: &str) -> Option<PathBuf> {
    [resource_dir.join("resources").join(name), resource_dir.join(name)]
        .into_iter()
        .find(|candidate| candidate.exists())
        .map(|found| plain_path(&found))
}

fn port_free(port: u16) -> bool {
    TcpListener::bind(("127.0.0.1", port)).is_ok()
}

/// The port the local server had last time, while it is still free. The window's origin includes the
/// port and the UI keeps its settings in that origin's storage, so a new port each launch would forget
/// them, automatic updates switched off included. Returns 0, any free port, only when none can be found.
fn stable_port(data_dir: Option<&Path>) -> u16 {
    let file = data_dir.map(|dir| dir.join(PORT_FILE));
    let saved = file
        .as_ref()
        .and_then(|path| std::fs::read_to_string(path).ok())
        .and_then(|text| text.trim().parse::<u16>().ok())
        .filter(|port| *port != 0);
    if let Some(port) = saved {
        if port_free(port) {
            return port;
        }
    }
    let fresh = TcpListener::bind(("127.0.0.1", 0))
        .and_then(|listener| listener.local_addr())
        .map(|address| address.port())
        .unwrap_or(0);
    if fresh != 0 {
        if let Some(path) = &file {
            let _ = std::fs::write(path, fresh.to_string());
        }
    }
    fresh
}

/// A child process that never flashes a console window on Windows.
fn command(program: &str) -> Command {
    #[allow(unused_mut)]
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

fn node_available() -> bool {
    command("node")
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn wait_for_url(child: &mut Child) -> Option<String> {
    let stdout = child.stdout.take()?;
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        if reader.read_line(&mut line).is_ok() {
            let _ = tx.send(line);
        }
    });
    let line = rx.recv_timeout(Duration::from_secs(25)).ok()?;
    parse_listening_url(&line)
}

fn parse_listening_url(line: &str) -> Option<String> {
    let rest = line.split("http://").nth(1)?;
    Some(format!("http://{}", rest.trim()))
}

fn boot_server(app: &tauri::AppHandle) -> Result<String, BootError> {
    if !node_available() {
        return Err(BootError::NodeMissing);
    }
    let resource_dir = app.path().resource_dir().map_err(|_| BootError::ServerMissing)?;
    let server = find_resource(&resource_dir, "server.cjs").ok_or(BootError::ServerMissing)?;
    // Projects, pins and thread titles persist per user, next to the app's other data.
    let data = app
        .path()
        .app_data_dir()
        .ok()
        .filter(|dir| std::fs::create_dir_all(dir).is_ok())
        .map(|dir| plain_path(&dir));
    let mut cmd = command("node");
    cmd.arg(&server).arg("--port").arg(stable_port(data.as_deref()).to_string());
    if let Some(frontend) = find_resource(&resource_dir, "frontend") {
        cmd.arg("--static").arg(&frontend);
    }
    if let Some(data) = &data {
        cmd.arg("--data-dir").arg(data);
    }
    let log = app
        .path()
        .app_log_dir()
        .ok()
        .map(|dir| plain_path(&dir))
        .and_then(|dir| std::fs::create_dir_all(&dir).ok().map(|_| dir.join("server.log")))
        .and_then(|path| OpenOptions::new().create(true).append(true).open(path).ok());
    cmd.stdout(Stdio::piped())
        .stderr(log.map(Stdio::from).unwrap_or_else(Stdio::null));
    let mut child = cmd.spawn().map_err(|_| BootError::ServerFailed)?;
    let url = wait_for_url(&mut child);
    if let Some(state) = app.try_state::<ServerChild>() {
        if let Ok(mut guard) = state.0.lock() {
            *guard = Some(child);
        }
        app.resources_table().add(ServerGuard(state.0.clone()));
    }
    url.ok_or(BootError::ServerFailed)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(ServerChild(Arc::new(Mutex::new(None))))
        .setup(|app| {
            // Open the window at once on a splash page; the server can take a few seconds to probe WSL.
            let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(SPLASH_PAGE.parse()?))
                .title("Helicon")
                .inner_size(1280.0, 820.0)
                .min_inner_size(880.0, 560.0);
            if CUSTOM_FRAME {
                builder = builder.decorations(false).initialization_script(FRAME_SCRIPT);
            }
            let window = builder.build()?;
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let target = match boot_server(&handle) {
                    Ok(url) => url,
                    Err(error) => {
                        // Error pages draw no window controls, so they get the native frame back.
                        if CUSTOM_FRAME {
                            let _ = window.set_decorations(true);
                        }
                        error.page().to_string()
                    }
                };
                if let Ok(url) = target.parse::<Url>() {
                    let _ = window.navigate(url);
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::Destroyed = event {
                    if let Some(state) = window.app_handle().try_state::<ServerChild>() {
                        if let Ok(mut guard) = state.0.lock() {
                            if let Some(mut child) = guard.take() {
                                let _ = child.kill();
                            }
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Helicon failed to start");
}

#[cfg(test)]
mod tests {
    use super::{find_resource, parse_listening_url, plain_path, stable_port, BootError, SPLASH_PAGE};
    use std::net::TcpListener;
    use std::path::{Path, PathBuf};

    #[test]
    fn strips_windows_verbatim_prefixes() {
        assert_eq!(plain_path(Path::new(r"\\?\D:\apps\helicon\server.cjs")), PathBuf::from(r"D:\apps\helicon\server.cjs"));
        assert_eq!(plain_path(Path::new(r"\\?\UNC\host\share\x")), PathBuf::from(r"\\host\share\x"));
        assert_eq!(plain_path(Path::new("/usr/lib/helicon")), PathBuf::from("/usr/lib/helicon"));
    }

    #[test]
    fn parses_the_listening_line() {
        assert_eq!(
            parse_listening_url("helicon-server listening on http://127.0.0.1:52314\n"),
            Some("http://127.0.0.1:52314".to_string())
        );
        assert_eq!(parse_listening_url("noise without url"), None);
    }

    #[test]
    fn inline_pages_are_valid_urls() {
        assert!(SPLASH_PAGE.parse::<tauri::Url>().is_ok());
        for error in [BootError::NodeMissing, BootError::ServerMissing, BootError::ServerFailed] {
            assert!(error.page().parse::<tauri::Url>().is_ok());
        }
    }

    #[test]
    fn finds_bundled_resources_under_their_relative_path() {
        let root = std::env::temp_dir().join(format!("helicon-res-{}", std::process::id()));
        std::fs::create_dir_all(root.join("resources")).unwrap();
        std::fs::write(root.join("resources").join("server.cjs"), "").unwrap();
        assert_eq!(find_resource(&root, "server.cjs"), Some(root.join("resources").join("server.cjs")));
        assert_eq!(find_resource(&root, "missing.cjs"), None);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn keeps_the_server_port_between_launches_while_it_is_free() {
        let dir = std::env::temp_dir().join(format!("helicon-port-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let first = stable_port(Some(&dir));
        assert_ne!(first, 0);
        assert_eq!(stable_port(Some(&dir)), first);
        let held = TcpListener::bind(("127.0.0.1", first)).unwrap();
        let moved = stable_port(Some(&dir));
        assert_ne!(moved, first, "a taken port is replaced");
        drop(held);
        assert_eq!(stable_port(Some(&dir)), moved, "and the replacement is remembered");
        assert_ne!(stable_port(None), 0);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
