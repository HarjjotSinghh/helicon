#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{mpsc, Mutex};
use std::time::Duration;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

struct ServerChild(Mutex<Option<Child>>);

const MISSING_NODE_PAGE: &str = "data:text/plain,Helicon could not start its local server because Node.js 22 or newer was not found. Install Node.js 22+, then relaunch Helicon.";

fn node_available() -> bool {
    Command::new("node")
        .arg("--version")
        .output()
        .map(|out| out.status.success())
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

fn boot_server(app: &tauri::AppHandle) -> Option<String> {
    if !node_available() {
        return None;
    }
    let resource_dir = app.path().resource_dir().ok()?;
    let server = resource_dir.join("server.cjs");
    if !server.exists() {
        return None;
    }
    let mut cmd = Command::new("node");
    cmd.arg(&server).arg("--port").arg("0");
    let frontend = resource_dir.join("frontend");
    if frontend.exists() {
        cmd.arg("--static").arg(&frontend);
    }
    cmd.stdout(Stdio::piped()).stderr(Stdio::null());
    let mut child = cmd.spawn().ok()?;
    let url = wait_for_url(&mut child);
    if let Some(state) = app.try_state::<ServerChild>() {
        if let Ok(mut guard) = state.0.lock() {
            *guard = Some(child);
        }
    }
    url
}

fn main() {
    tauri::Builder::default()
        .manage(ServerChild(Mutex::new(None)))
        .setup(|app| {
            let url = boot_server(app.handle()).unwrap_or_else(|| MISSING_NODE_PAGE.to_string());
            WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External(
                    url.parse().expect("server URL parses"),
                ),
            )
            .title("Helicon")
            .inner_size(1280.0, 800.0)
            .build()?;
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
    use super::parse_listening_url;

    #[test]
    fn parses_the_listening_line() {
        assert_eq!(
            parse_listening_url("helicon-server listening on http://127.0.0.1:52314\n"),
            Some("http://127.0.0.1:52314".to_string())
        );
        assert_eq!(parse_listening_url("noise without url"), None);
    }
}
