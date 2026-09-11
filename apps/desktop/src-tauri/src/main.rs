// GUI subsystem in every build: a debug build would otherwise open a stray console window.
// Nothing is lost, the server's output goes to server.log.
#![windows_subsystem = "windows"]

use std::fs::OpenOptions;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{mpsc, Mutex};
use std::time::Duration;
use tauri::{Manager, Url, WebviewUrl, WebviewWindowBuilder};

struct ServerChild(Mutex<Option<Child>>);

/// Windows gets Helicon's own title bar, drawn by the UI; other platforms keep the native frame.
const CUSTOM_FRAME: bool = cfg!(windows);

/// Tells the UI, before it loads, to draw the window controls and drag regions.
const FRAME_SCRIPT: &str = "window.__HELICON_FRAME__ = 'custom';";

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
    let mut cmd = command("node");
    cmd.arg(&server).arg("--port").arg("0");
    if let Some(frontend) = find_resource(&resource_dir, "frontend") {
        cmd.arg("--static").arg(&frontend);
    }
    // Projects, pins and thread titles persist per user, next to the app's other data.
    if let Ok(data) = app.path().app_data_dir() {
        if std::fs::create_dir_all(&data).is_ok() {
            cmd.arg("--data-dir").arg(plain_path(&data));
        }
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
    }
    url.ok_or(BootError::ServerFailed)
}

fn main() {
    tauri::Builder::default()
        .manage(ServerChild(Mutex::new(None)))
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
    use super::{find_resource, parse_listening_url, plain_path, BootError, SPLASH_PAGE};
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
}
