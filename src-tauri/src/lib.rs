pub mod clipboard;
pub mod history;
pub mod server;
pub mod types;

use clipboard::{set_system_clipboard, start_clipboard_monitor};
use history::load_history;
use local_ip_address::list_afinet_netifas;
use qrcode::render::svg;
use qrcode::QrCode;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Manager, State};
use tokio::sync::{broadcast, RwLock};
use types::{AppState, ConnectedClient, HistoryItem, ServerStatus, WsEvent};

pub fn detect_network_ips() -> (String, Vec<String>) {
    let mut real_lan_ips = Vec::new();

    if let Ok(interfaces) = list_afinet_netifas() {
        for (name, ip) in interfaces {
            if let std::net::IpAddr::V4(ipv4) = ip {
                if !ipv4.is_loopback() && !ipv4.is_link_local() {
                    let ip_str = ipv4.to_string();
                    let lower = name.to_lowercase();

                    let is_vpn_or_virtual = lower.contains("throne")
                        || lower.contains("tun")
                        || lower.contains("tap")
                        || lower.contains("vethernet")
                        || lower.contains("wsl")
                        || lower.contains("docker")
                        || lower.contains("virtual")
                        || lower.contains("host-only")
                        || lower.contains("tailscale")
                        || lower.contains("zerotier")
                        || lower.contains("wireguard")
                        || lower.contains("openvpn")
                        || ip_str.starts_with("172.19.")
                        || ip_str.starts_with("10.8.")
                        || ip_str.starts_with("198.18.");

                    if !is_vpn_or_virtual {
                        real_lan_ips.push((ip_str, name));
                    }
                }
            }
        }
    }

    // Sort: 192.168.x.x (score 2), 10.x.x.x (score 1), others (score 0)
    real_lan_ips.sort_by(|(a, _), (b, _)| {
        let score_a = if a.starts_with("192.168.") {
            2
        } else if a.starts_with("10.") {
            1
        } else {
            0
        };
        let score_b = if b.starts_with("192.168.") {
            2
        } else if b.starts_with("10.") {
            1
        } else {
            0
        };
        score_b.cmp(&score_a)
    });

    let best_ip = if let Some((ip, _)) = real_lan_ips.first() {
        ip.clone()
    } else {
        "127.0.0.1".to_string()
    };

    let available: Vec<String> = if !real_lan_ips.is_empty() {
        real_lan_ips.into_iter().map(|(ip, _)| ip).collect()
    } else {
        vec!["127.0.0.1".to_string()]
    };

    (best_ip, available)
}

fn get_default_download_dir() -> PathBuf {
    if let Some(user_dirs) = directories::UserDirs::new() {
        if let Some(download) = user_dirs.download_dir() {
            let path = download.join("LocalDrop");
            let _ = fs::create_dir_all(&path);
            return path;
        }
    }
    let fallback = PathBuf::from("LocalDropDownloads");
    let _ = fs::create_dir_all(&fallback);
    fallback
}

#[tauri::command]
async fn get_server_status(state: State<'_, AppState>) -> Result<ServerStatus, String> {
    let ip = state.local_ip.read().await.clone();
    let available_ips = state.available_ips.read().await.clone();
    let clip = state.active_clipboard.read().await.clone();

    let clients_map = state.clients.read().await;
    let mobile_clients: Vec<ConnectedClient> = clients_map
        .values()
        .filter(|(c, _)| c.client_type == "mobile")
        .map(|(c, _)| c.clone())
        .collect();
    let client_count = mobile_clients.len();

    Ok(ServerStatus {
        ip,
        available_ips,
        port: state.port,
        active_clipboard: clip,
        connected_clients: client_count,
        clients: mobile_clients,
        download_dir: state.download_dir.to_string_lossy().to_string(),
    })
}

#[tauri::command]
async fn get_history(state: State<'_, AppState>) -> Result<Vec<HistoryItem>, String> {
    let hist = state.history.read().await.clone();
    Ok(hist)
}

#[tauri::command]
async fn clear_history(state: State<'_, AppState>) -> Result<bool, String> {
    state.clear_history().await;
    let _ = state.ws_broadcast.send(WsEvent::HistoryUpdated { items: Vec::new() });
    Ok(true)
}

#[tauri::command]
async fn copy_to_clipboard(state: State<'_, AppState>, text: String) -> Result<bool, String> {
    {
        let mut last_local = state.last_local_clip.write().await;
        *last_local = text.clone();
    }
    {
        let mut active = state.active_clipboard.write().await;
        *active = text.clone();
    }
    set_system_clipboard(&text)?;
    Ok(true)
}

#[tauri::command]
async fn open_download_dir(state: State<'_, AppState>) -> Result<bool, String> {
    let dir = &state.download_dir;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(true)
}

#[tauri::command]
async fn open_file_in_explorer(file_path: String) -> Result<bool, String> {
    let path = std::path::Path::new(&file_path);
    if path.exists() {
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("explorer")
                .arg(format!("/select,{}", path.display()))
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        Ok(true)
    } else {
        Err("File not found on disk".into())
    }
}

#[tauri::command]
fn generate_qr_svg(url: String) -> Result<String, String> {
    let code = QrCode::new(url.as_bytes()).map_err(|e| e.to_string())?;
    let image = code.render::<svg::Color>().min_dimensions(200, 200).build();
    Ok(image)
}

#[tauri::command]
async fn disconnect_client(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let mut clients_map = state.clients.write().await;
    if let Some((_, abort_tx)) = clients_map.remove(&id) {
        let _ = abort_tx.send(());
    }

    let mobile_clients: Vec<ConnectedClient> = clients_map
        .values()
        .filter(|(c, _)| c.client_type == "mobile")
        .map(|(c, _)| c.clone())
        .collect();
    let count = mobile_clients.len();
    drop(clients_map);

    let _ = state.ws_broadcast.send(WsEvent::ClientCount { count });
    let _ = state.ws_broadcast.send(WsEvent::ClientsUpdated {
        clients: mobile_clients,
    });
    Ok(true)
}

#[tauri::command]
async fn disconnect_all_clients(state: State<'_, AppState>) -> Result<bool, String> {
    let mut clients_map = state.clients.write().await;
    let keys: Vec<String> = clients_map
        .iter()
        .filter(|(_, (c, _))| c.client_type == "mobile")
        .map(|(k, _)| k.clone())
        .collect();

    for k in keys {
        if let Some((_, abort_tx)) = clients_map.remove(&k) {
            let _ = abort_tx.send(());
        }
    }
    drop(clients_map);

    let _ = state.ws_broadcast.send(WsEvent::ClientCount { count: 0 });
    let _ = state.ws_broadcast.send(WsEvent::ClientsUpdated { clients: Vec::new() });
    Ok(true)
}

#[tauri::command]
async fn set_server_ip(state: State<'_, AppState>, ip: String) -> Result<bool, String> {
    {
        let mut cur_ip = state.local_ip.write().await;
        *cur_ip = ip;
    }
    Ok(true)
}

#[tauri::command]
async fn paste_from_clipboard(state: State<'_, AppState>) -> Result<Option<HistoryItem>, String> {
    // Check if screenshot / image is in clipboard
    if let Ok(Some(item)) = clipboard::save_clipboard_image_entry(&state).await {
        return Ok(Some(item));
    }

    // Check if text is in clipboard
    if let Ok(mut clip) = arboard::Clipboard::new() {
        if let Ok(text) = clip.get_text() {
            if !text.trim().is_empty() {
                let now = chrono::Utc::now().timestamp_millis();
                let item = HistoryItem::new(
                    uuid::Uuid::new_v4().to_string(),
                    "clipboard".to_string(),
                    text.clone(),
                    None,
                    "win_to_ios".to_string(),
                    now,
                    None,
                );
                {
                    let mut cur = state.active_clipboard.write().await;
                    *cur = text.clone();
                }
                {
                    let mut last = state.last_local_clip.write().await;
                    *last = text.clone();
                }
                state.add_history_item(item.clone()).await;
                let _ = state.ws_broadcast.send(WsEvent::ClipboardUpdate {
                    content: text,
                    timestamp: now,
                    source: "windows".to_string(),
                });
                return Ok(Some(item));
            }
        }
    }

    Ok(None)
}

#[tauri::command]
async fn add_dropped_files(
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> Result<Vec<HistoryItem>, String> {
    let mut items = Vec::new();
    let now = chrono::Utc::now().timestamp_millis();

    for path_str in paths {
        let path = PathBuf::from(&path_str);
        if !path.exists() {
            continue;
        }

        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("file")
            .to_string();

        let mut target_path = state.download_dir.join(&file_name);
        if target_path.exists() {
            let stem = target_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("file");
            let ext = target_path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| format!(".{}", e))
                .unwrap_or_default();
            let mut counter = 1;
            loop {
                let candidate = state.download_dir.join(format!("{}_{}{}", stem, counter, ext));
                if !candidate.exists() {
                    target_path = candidate;
                    break;
                }
                counter += 1;
            }
        }

        if let Err(e) = fs::copy(&path, &target_path) {
            log::warn!("Failed to copy dropped file {}: {}", path_str, e);
            continue;
        }

        let size = fs::metadata(&target_path).map(|m| m.len()).unwrap_or(0);
        let saved_file_name = target_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(&file_name)
            .to_string();

        let item = HistoryItem::new(
            uuid::Uuid::new_v4().to_string(),
            "file".to_string(),
            saved_file_name.clone(),
            Some(size),
            "win_to_ios".to_string(),
            now,
            Some(target_path.to_string_lossy().to_string()),
        );

        state.add_history_item(item.clone()).await;

        let _ = state.ws_broadcast.send(WsEvent::FileReceived {
            id: item.id.clone(),
            file_name: saved_file_name,
            size,
            timestamp: now,
        });

        items.push(item);
    }

    Ok(items)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");

    let (best_ip, available_ips) = detect_network_ips();

    // Automatically find an available port starting from 52025 up to 52060
    let (listener, actual_port) = rt.block_on(async {
        for port_candidate in 52025..=52060 {
            let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port_candidate));
            if let Ok(l) = tokio::net::TcpListener::bind(addr).await {
                log::info!("Successfully bound to port {}", port_candidate);
                return (l, port_candidate);
            }
        }
        // Fallback: let OS assign any free port
        let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 0));
        let l = tokio::net::TcpListener::bind(addr).await.expect("Failed to bind any port");
        let p = l.local_addr().map(|a| a.port()).unwrap_or(52025);
        (l, p)
    });

    let (ws_tx, _) = broadcast::channel(100);
    let initial_history = load_history();
    let download_dir = get_default_download_dir();

    let app_state = AppState {
        active_clipboard: Arc::new(RwLock::new(String::new())),
        last_local_clip: Arc::new(RwLock::new(String::new())),
        history: Arc::new(RwLock::new(initial_history)),
        ws_broadcast: ws_tx,
        download_dir,
        local_ip: Arc::new(RwLock::new(best_ip)),
        available_ips: Arc::new(RwLock::new(available_ips)),
        port: actual_port,
        clients: Arc::new(RwLock::new(HashMap::new())),
    };

    // Start Axum HTTP & WebSocket Server with the already bound listener
    let server_state = app_state.clone();
    rt.spawn(async move {
        let app = server::build_router(server_state.clone());
        let _ = axum::serve(listener, app).await;
    });

    // Start background Windows clipboard watcher
    let handle = rt.handle().clone();
    start_clipboard_monitor(app_state.clone(), handle);

    std::mem::forget(rt);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let icon_bytes = include_bytes!("../icons/icon.png");
            if let Ok(icon) = tauri::image::Image::from_bytes(icon_bytes) {
                for window in app.webview_windows().values() {
                    let _ = window.set_icon(icon.clone());
                }
            }
            Ok(())
        })
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_server_status,
            get_history,
            clear_history,
            copy_to_clipboard,
            open_download_dir,
            open_file_in_explorer,
            generate_qr_svg,
            disconnect_client,
            disconnect_all_clients,
            set_server_ip,
            paste_from_clipboard,
            add_dropped_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_api_status() {
        let (ws_tx, _) = broadcast::channel(10);
        let state = AppState {
            active_clipboard: Arc::new(RwLock::new("Test Clipboard".into())),
            last_local_clip: Arc::new(RwLock::new("Test Clipboard".into())),
            history: Arc::new(RwLock::new(Vec::new())),
            ws_broadcast: ws_tx,
            download_dir: std::env::temp_dir(),
            local_ip: Arc::new(RwLock::new("192.168.1.50".into())),
            available_ips: Arc::new(RwLock::new(vec!["192.168.1.50".into()])),
            port: 52025,
            clients: Arc::new(RwLock::new(HashMap::new())),
        };

        let app = server::build_router(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/status")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
        let status_json: ServerStatus = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(status_json.active_clipboard, "Test Clipboard");
        assert_eq!(status_json.connected_clients, 0);
    }
}
