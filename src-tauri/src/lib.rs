use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::Manager;
use std::path::PathBuf;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn restart_backend(state: tauri::State<BackendProcess>) -> Result<(), String> {
    if let Ok(mut child) = state.0.lock() {
        if let Some(mut c) = child.take() {
            let _ = c.kill();
        }
    }
    let new_child = try_start_backend();
    if let Ok(mut child) = state.0.lock() {
        *child = new_child;
    }
    Ok(())
}

#[tauri::command]
async fn open_markdown_file(app: tauri::AppHandle) -> Result<Option<(String, String)>, String> {
    use tauri_plugin_dialog::DialogExt;
    let file_path = app.dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .blocking_pick_file();

    match file_path {
        Some(path) => {
            let path_str = path.to_string();
            let content = std::fs::read_to_string(&path_str)
                .map_err(|e| format!("Failed to read file: {}", e))?;
            Ok(Some((content, path_str)))
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn save_markdown_file(file_path: String, content: String) -> Result<(), String> {
    std::fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
async fn copy_image_to_assets(app: tauri::AppHandle, source_path: String) -> Result<String, String> {
    let workspace_path = get_workspace_path(&app);
    let assets_dir = workspace_path.join(".zennote").join("assets");
    std::fs::create_dir_all(&assets_dir)
        .map_err(|e| format!("Failed to create assets dir: {}", e))?;

    let file_name = std::path::Path::new(&source_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image");
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let dest_name = format!("{}-{}", timestamp, file_name);
    let dest_path = assets_dir.join(&dest_name);

    std::fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy image: {}", e))?;

    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn read_image_base64(_app: tauri::AppHandle, path: String) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    let bytes = std::fs::read(&path)
        .map_err(|e| format!("Failed to read image: {}", e))?;
    Ok(STANDARD.encode(&bytes))
}

fn get_workspace_path(_app: &tauri::AppHandle) -> PathBuf {
    let exe_path = std::env::current_exe().unwrap_or_else(|_| std::env::temp_dir());
    let exe_dir = exe_path.parent().unwrap_or(&exe_path);
    exe_dir.join("ZenNoteWorkspace")
}

struct BackendProcess(Mutex<Option<Child>>);

#[derive(serde::Serialize, serde::Deserialize)]
struct WindowState {
    width: u32,
    height: u32,
    x: i32,
    y: i32,
}

fn window_state_path(app: &tauri::AppHandle) -> PathBuf {
    let mut path = app.path().app_data_dir().unwrap_or_else(|_| std::env::temp_dir());
    path.push("window-state.json");
    path
}

fn load_window_state(app: &tauri::AppHandle) -> Option<WindowState> {
    let path = window_state_path(app);
    if !path.exists() {
        return None;
    }
    let content = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

fn save_window_state(window: &tauri::Window) -> Result<(), Box<dyn std::error::Error>> {
    let size = window.inner_size()?;
    let pos = window.outer_position()?;
    let state = WindowState {
        width: size.width,
        height: size.height,
        x: pos.x,
        y: pos.y,
    };
    let path = window_state_path(&window.app_handle());
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, serde_json::to_string_pretty(&state)?)?;
    Ok(())
}

fn try_start_backend() -> Option<Child> {
    // Skip if a backend is already running (dev workflow)
    if TcpStream::connect_timeout(
        &"127.0.0.1:8080".parse().unwrap(),
        Duration::from_millis(200),
    )
    .is_ok()
    {
        return None;
    }

    let exe_path = std::env::current_exe().ok()?;
    let exe_dir = exe_path.parent()?;
    let backend_exe = exe_dir.join("bin").join("zennote-backend.exe");

    if !backend_exe.exists() {
        return None;
    }

    let mut cmd = Command::new(backend_exe);
    cmd.current_dir(exe_dir);

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let mut child = cmd.spawn().ok()?;

    // Wait for the backend to actually bind to :8080 (max 30s).
    // On first launch SQLite schema init + Windows firewall popup
    // can take several seconds; a fixed 800ms sleep is not enough.
    let mut ready = false;
    for _ in 0..120 {
        thread::sleep(Duration::from_millis(250));
        if TcpStream::connect_timeout(
            &"127.0.0.1:8080".parse().unwrap(),
            Duration::from_millis(100),
        )
        .is_ok()
        {
            ready = true;
            break;
        }
    }

    if ready {
        Some(child)
    } else {
        let _ = child.kill();
        None
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            restart_backend,
            open_markdown_file,
            save_markdown_file,
            copy_image_to_assets,
            read_image_base64
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    // Hide window until backend is ready so users don't see a
                    // blank UI while SQLite initializes / Windows firewall
                    // asks for permission on first launch.
                    let _ = window.hide();

                    if let Some(icon) = app.default_window_icon() {
                        let _ = window.set_icon(icon.clone());
                    }

                    if let Some(state) = load_window_state(&app.handle()) {
                        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(state.width, state.height)));
                        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(state.x, state.y)));
                    }
                }
            }

            let backend = try_start_backend();
            app.manage(BackendProcess(Mutex::new(backend)));

            #[cfg(desktop)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let _ = save_window_state(&window);

                if let Some(state) = window.app_handle().try_state::<BackendProcess>() {
                    if let Ok(mut child) = state.0.lock() {
                        if let Some(mut c) = child.take() {
                            let _ = c.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
