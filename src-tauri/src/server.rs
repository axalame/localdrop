use crate::clipboard::set_system_clipboard;
use crate::types::{
    AppState, ClipboardPayload, ConnectedClient, HistoryItem, ServerStatus, WsEvent, WsQuery,
};
use axum::{
    extract::{
        multipart::Multipart,
        ws::{Message, WebSocket, WebSocketUpgrade},
        DefaultBodyLimit, Path, Query, State,
    },
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::path::PathBuf;
use tokio::sync::oneshot;
use tower::ServiceExt;
use tower_http::cors::CorsLayer;
use tower_http::services::{ServeDir, ServeFile};
use uuid::Uuid;

fn find_dist_dir() -> Option<PathBuf> {
    let candidates = [
        PathBuf::from("dist"),
        PathBuf::from("../dist"),
        PathBuf::from("../../dist"),
    ];
    for p in &candidates {
        if p.join("index.html").exists() {
            return Some(p.clone());
        }
    }
    None
}

pub fn build_router(state: AppState) -> Router {
    let upload_router = Router::new()
        .route("/api/upload", post(upload_files))
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024 * 1024)); // 10 GB limit for file transfers

    let api_router = Router::new()
        .route("/api/status", get(get_status))
        .route("/api/history", get(get_history))
        .route("/api/history/clear", post(clear_history))
        .route("/api/clipboard", post(receive_clipboard))
        .route("/api/download/{id}", get(download_file))
        .route("/api/view/{id}", get(view_file))
        .route("/api/shortcut", get(get_shortcut_guide))
        .route("/api/clients/disconnect/{id}", post(disconnect_client))
        .route("/api/clients/disconnect_all", post(disconnect_all_clients))
        .route("/api/set_ip", post(set_ip))
        .route("/api/paste", post(handle_paste))
        .route("/ws", get(ws_handler))
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024)) // 10 MB safe limit for JSON payloads
        .merge(upload_router)
        .layer(CorsLayer::permissive())
        .with_state(state);

    if let Some(dist) = find_dist_dir() {
        let serve_dir = ServeDir::new(&dist).fallback(ServeFile::new(dist.join("index.html")));
        api_router.fallback_service(serve_dir)
    } else {
        api_router.fallback(fallback_html)
    }
}

async fn get_status(State(state): State<AppState>) -> Json<ServerStatus> {
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

    Json(ServerStatus {
        ip,
        available_ips,
        port: state.port,
        active_clipboard: clip,
        connected_clients: client_count,
        clients: mobile_clients,
        download_dir: state.download_dir.to_string_lossy().to_string(),
    })
}

async fn set_ip(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    if let Some(new_ip) = payload.get("ip").and_then(|v| v.as_str()) {
        let mut ip = state.local_ip.write().await;
        *ip = new_ip.to_string();
    }
    Json(json!({ "success": true }))
}

async fn disconnect_client(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
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

    Json(json!({ "success": true }))
}

async fn disconnect_all_clients(State(state): State<AppState>) -> Json<serde_json::Value> {
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

    Json(json!({ "success": true }))
}

async fn get_history(State(state): State<AppState>) -> Json<Vec<HistoryItem>> {
    let hist = state.history.read().await.clone();
    Json(hist)
}

async fn clear_history(State(state): State<AppState>) -> Json<serde_json::Value> {
    state.clear_history().await;
    let _ = state.ws_broadcast.send(WsEvent::HistoryUpdated { items: Vec::new() });
    Json(json!({ "success": true }))
}

async fn receive_clipboard(
    State(state): State<AppState>,
    body: Result<Json<ClipboardPayload>, axum::extract::rejection::JsonRejection>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let text = match body {
        Ok(Json(payload)) => payload.text,
        Err(_) => {
            return Err((StatusCode::BAD_REQUEST, "Invalid JSON payload with 'text'".into()));
        }
    };

    if text.trim().is_empty() {
        return Ok(Json(json!({ "success": true, "message": "Ignored empty clipboard" })));
    }

    {
        let mut last_local = state.last_local_clip.write().await;
        *last_local = text.clone();
    }
    {
        let mut active = state.active_clipboard.write().await;
        *active = text.clone();
    }

    if let Err(e) = set_system_clipboard(&text) {
        log::error!("Failed to set Windows clipboard: {}", e);
    }

    let now = Utc::now().timestamp_millis();
    let item = HistoryItem {
        id: Uuid::new_v4().to_string(),
        item_type: "clipboard".to_string(),
        content: text.clone(),
        size: None,
        direction: "ios_to_win".to_string(),
        timestamp: now,
        file_path: None,
    };

    state.add_history_item(item).await;

    let _ = state.ws_broadcast.send(WsEvent::ClipboardUpdate {
        content: text,
        timestamp: now,
        source: "ios".to_string(),
    });


    Ok(Json(json!({ "success": true })))
}

#[derive(Debug, serde::Deserialize)]
pub struct UploadQuery {
    pub source: Option<String>,
}

pub fn sanitize_filename(name: &str) -> String {
    let base = std::path::Path::new(name)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file");

    let sanitized: String = base
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            other => other,
        })
        .collect();

    let trimmed = sanitized.trim().trim_matches('.').to_string();
    if trimmed.is_empty() {
        return format!("file_{}.bin", Uuid::new_v4());
    }

    let upper = trimmed.to_uppercase();
    let stem = upper.split('.').next().unwrap_or("");
    let reserved = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7",
        "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    if reserved.contains(&stem) {
        format!("safe_{}", trimmed)
    } else {
        trimmed
    }
}

pub async fn resolve_safe_file_path(
    state: &AppState,
    id: &str,
) -> Result<PathBuf, (StatusCode, String)> {
    let hist = state.history.read().await;
    let item = hist.iter().find(|i| i.id == id).cloned();
    drop(hist);

    let item = match item {
        Some(i) => i,
        None => return Err((StatusCode::NOT_FOUND, "File not found in history".into())),
    };

    let path_str = match item.file_path {
        Some(p) => p,
        None => return Err((StatusCode::NOT_FOUND, "No file path recorded".into())),
    };

    let path = PathBuf::from(path_str);
    if !path.exists() {
        return Err((StatusCode::NOT_FOUND, "File missing on disk".into()));
    }

    // Security check: ensure path is strictly inside download_dir (prevent arbitrary file disclosure)
    let canonical_download_dir = state
        .download_dir
        .canonicalize()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Download directory error: {}", e)))?;
    let canonical_file_path = path
        .canonicalize()
        .map_err(|e| (StatusCode::NOT_FOUND, format!("File path error: {}", e)))?;

    if !canonical_file_path.starts_with(&canonical_download_dir) {
        log::warn!("Access denied: attempted to access file outside download directory: {:?}", canonical_file_path);
        return Err((StatusCode::FORBIDDEN, "Access denied: file is outside download directory".into()));
    }

    Ok(canonical_file_path)
}

async fn upload_files(
    State(state): State<AppState>,
    Query(query): Query<UploadQuery>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut uploaded_files = Vec::new();
    let is_from_pc = query.source.as_deref() == Some("windows");
    let direction = if is_from_pc { "win_to_ios" } else { "ios_to_win" };

    while let Ok(Some(mut field)) = multipart.next_field().await {
        let original_name = field
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| format!("file_{}.bin", Uuid::new_v4()));

        let clean_name = sanitize_filename(&original_name);

        let mut target_path = state.download_dir.join(&clean_name);
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

        let mut file = tokio::fs::File::create(&target_path)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let mut total_bytes = 0u64;

        while let Ok(Some(chunk)) = field.chunk().await {
            total_bytes += chunk.len() as u64;
            tokio::io::AsyncWriteExt::write_all(&mut file, &chunk)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }

        let saved_file_name = target_path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or(&clean_name)
            .to_string();

        let now = Utc::now().timestamp_millis();
        let item_id = Uuid::new_v4().to_string();
        let item = HistoryItem {
            id: item_id.clone(),
            item_type: "file".to_string(),
            content: saved_file_name.clone(),
            size: Some(total_bytes),
            direction: direction.to_string(),
            timestamp: now,
            file_path: Some(target_path.to_string_lossy().to_string()),
        };

        state.add_history_item(item).await;

        let _ = state.ws_broadcast.send(WsEvent::FileReceived {
            id: item_id,
            file_name: saved_file_name.clone(),
            size: total_bytes,
            timestamp: now,
        });

        uploaded_files.push(json!({
            "fileName": saved_file_name,
            "size": total_bytes,
        }));
    }

    Ok(Json(json!({
        "success": true,
        "files": uploaded_files
    })))
}

async fn download_file(
    State(state): State<AppState>,
    Path(id): Path<String>,
    req: axum::extract::Request,
) -> Result<Response, (StatusCode, String)> {
    let canonical_path = resolve_safe_file_path(&state, &id).await?;

    let filename = canonical_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("download");
    let content_disposition = format!("attachment; filename=\"{}\"", filename);

    let mut response = ServeFile::new(&canonical_path)
        .oneshot(req)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .into_response();

    if let Ok(val) = HeaderValue::from_str(&content_disposition) {
        response.headers_mut().insert(header::CONTENT_DISPOSITION, val);
    }

    Ok(response)
}

async fn view_file(
    State(state): State<AppState>,
    Path(id): Path<String>,
    req: axum::extract::Request,
) -> Result<Response, (StatusCode, String)> {
    let canonical_path = resolve_safe_file_path(&state, &id).await?;

    let response = ServeFile::new(&canonical_path)
        .oneshot(req)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .into_response();

    Ok(response)
}

async fn get_shortcut_guide(State(state): State<AppState>) -> Html<String> {
    let ip = state.local_ip.read().await.clone();
    let port = state.port;
    let endpoint = format!("http://{}:{}/api/clipboard", ip, port);

    let html = format!(
        r#"<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>iOS Shortcut для LocalDrop</title>
    <style>
        body {{ font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; line-height: 1.5; }}
        .card {{ background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #334155; }}
        h1 {{ font-size: 20px; color: #38bdf8; }}
        code {{ background: #020617; padding: 4px 8px; border-radius: 6px; color: #a7f3d0; word-break: break-all; }}
        ol {{ padding-left: 20px; }}
        li {{ margin-bottom: 10px; }}
    </style>
</head>
<body>
    <div class="card">
        <h1>⚡ Настройка iOS Shortcut (Команды)</h1>
        <p>Создайте команду в приложении <b>Команды</b> на iPhone:</p>
        <ol>
            <li>Действие 1: <b>Получить буфер обмена</b></li>
            <li>Действие 2: <b>Получить содержимое URL</b>:
                <br>URL: <code>{}</code>
                <br>Метод: <b>POST</b>
                <br>Заголовок: <code>Content-Type: application/json</code>
                <br>Тело запроса: <b>JSON</b>
                <br>Ключ: <code>text</code> &rarr; Значение: <i>Буфер обмена</i>
            </li>
        </ol>
        <p>Готово! Теперь привяжите эту команду на <b>Кнопку действия</b>, <b>Виджет</b> или <b>Касание задней панели</b> (Настройки &rarr; Универсальный доступ &rarr; Касание).</p>
    </div>
</body>
</html>"#,
        endpoint
    );

    Html(html)
}

async fn fallback_html() -> Html<&'static str> {
    Html(r#"<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LocalDrop</title>
</head>
<body style="background:#020617;color:#f8fafc;font-family:sans-serif;padding:24px;text-align:center;">
    <h2>LocalDrop Web Server Active</h2>
    <p>Соберите фронтенд командой: <code>npm run build</code></p>
</body>
</html>"#)
}

fn parse_device_name(user_agent: &str, client_type: &str) -> String {
    if client_type == "desktop" {
        return "Windows App".to_string();
    }
    let ua = user_agent.to_lowercase();
    if ua.contains("iphone") {
        "iPhone (Safari)".to_string()
    } else if ua.contains("ipad") {
        "iPad (Safari)".to_string()
    } else if ua.contains("android") {
        "Android Browser".to_string()
    } else if ua.contains("macintosh") {
        "Mac (Safari)".to_string()
    } else {
        "Мобильный клиент".to_string()
    }
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQuery>,
    headers: HeaderMap,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let user_agent = headers
        .get(header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("Unknown")
        .to_string();

    let client_ip = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("LAN")
        .to_string();

    let client_type = query.client_type.unwrap_or_else(|| "mobile".to_string());
    let device_name = parse_device_name(&user_agent, &client_type);

    ws.on_upgrade(move |socket| {
        handle_ws_socket(socket, state, client_type, client_ip, user_agent, device_name)
    })
}

async fn handle_ws_socket(
    socket: WebSocket,
    state: AppState,
    client_type: String,
    ip: String,
    user_agent: String,
    device_name: String,
) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.ws_broadcast.subscribe();

    let client_id = Uuid::new_v4().to_string();
    let (abort_tx, mut abort_rx) = oneshot::channel::<()>();

    let client_info = ConnectedClient {
        id: client_id.clone(),
        client_type: client_type.clone(),
        ip,
        user_agent,
        device_name,
        connected_at: Utc::now().timestamp_millis(),
    };

    // Store client in registry
    {
        let mut map = state.clients.write().await;
        map.insert(client_id.clone(), (client_info.clone(), abort_tx));
    }

    // Only update and broadcast count for MOBILE clients!
    if client_type == "mobile" {
        let clients_map = state.clients.read().await;
        let mobile_list: Vec<ConnectedClient> = clients_map
            .values()
            .filter(|(c, _)| c.client_type == "mobile")
            .map(|(c, _)| c.clone())
            .collect();
        let count = mobile_list.len();
        drop(clients_map);

        let _ = state.ws_broadcast.send(WsEvent::ClientCount { count });
        let _ = state.ws_broadcast.send(WsEvent::ClientsUpdated { clients: mobile_list });
    }

    // Send initial active clipboard to the client
    let active_clip = state.active_clipboard.read().await.clone();
    let init_event = WsEvent::ClipboardUpdate {
        content: active_clip,
        timestamp: Utc::now().timestamp_millis(),
        source: "windows".to_string(),
    };
    if let Ok(msg) = serde_json::to_string(&init_event) {
        let _ = sender.send(Message::Text(msg.into())).await;
    }

    let mut send_task = tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(event) => {
                    if let Ok(json_str) = serde_json::to_string(&event) {
                        if sender.send(Message::Text(json_str.into())).await.is_err() {
                            break;
                        }
                    }
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                    log::warn!("WebSocket client lagged behind, skipped {} messages", skipped);
                    continue;
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                    break;
                }
            }
        }
    });

    let state_clone = state.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text) = msg {
                if let Ok(payload) = serde_json::from_str::<ClipboardPayload>(&text) {
                    if !payload.text.trim().is_empty() {
                        {
                            let mut last_local = state_clone.last_local_clip.write().await;
                            *last_local = payload.text.clone();
                        }
                        {
                            let mut active = state_clone.active_clipboard.write().await;
                            *active = payload.text.clone();
                        }
                        let _ = set_system_clipboard(&payload.text);
                        let now = Utc::now().timestamp_millis();
                        let item = HistoryItem {
                            id: Uuid::new_v4().to_string(),
                            item_type: "clipboard".to_string(),
                            content: payload.text.clone(),
                            size: None,
                            direction: "ios_to_win".to_string(),
                            timestamp: now,
                            file_path: None,
                        };
                        state_clone.add_history_item(item).await;
                        let _ = state_clone.ws_broadcast.send(WsEvent::ClipboardUpdate {
                            content: payload.text,
                            timestamp: now,
                            source: "ios".to_string(),
                        });
                    }
                }
            }
        }
    });

    tokio::select! {
        _ = &mut send_task => recv_task.abort(),
        _ = &mut recv_task => send_task.abort(),
        _ = &mut abort_rx => {
            // Forcefully disconnected by desktop operator
            send_task.abort();
            recv_task.abort();
        }
    };

    // Client disconnected, cleanup
    {
        let mut map = state.clients.write().await;
        map.remove(&client_id);
    }

    if client_type == "mobile" {
        let clients_map = state.clients.read().await;
        let mobile_list: Vec<ConnectedClient> = clients_map
            .values()
            .filter(|(c, _)| c.client_type == "mobile")
            .map(|(c, _)| c.clone())
            .collect();
        let count = mobile_list.len();
        drop(clients_map);

        let _ = state.ws_broadcast.send(WsEvent::ClientCount { count });
        let _ = state.ws_broadcast.send(WsEvent::ClientsUpdated { clients: mobile_list });
    }
}

async fn handle_paste(State(state): State<AppState>) -> Json<serde_json::Value> {
    if let Ok(Some(item)) = crate::clipboard::save_clipboard_image_entry(&state).await {
        return Json(json!({ "success": true, "type": "image", "item": item }));
    }
    if let Ok(mut clip) = arboard::Clipboard::new() {
        if let Ok(text) = clip.get_text() {
            if !text.trim().is_empty() {
                let now = Utc::now().timestamp_millis();
                let item = HistoryItem {
                    id: Uuid::new_v4().to_string(),
                    item_type: "clipboard".to_string(),
                    content: text.clone(),
                    size: None,
                    direction: "win_to_ios".to_string(),
                    timestamp: now,
                    file_path: None,
                };
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
                return Json(json!({ "success": true, "type": "clipboard", "item": item }));
            }
        }
    }
    Json(json!({ "success": false, "message": "Буфер обмена пуст" }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use tokio::sync::{broadcast, RwLock};

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("../../etc/passwd"), "passwd");
        assert_eq!(sanitize_filename("C:\\Windows\\System32\\cmd.exe"), "cmd.exe");
        assert_eq!(sanitize_filename("my:file*name?.png"), "my_file_name_.png");
        assert_eq!(sanitize_filename("CON.txt"), "safe_CON.txt");
        assert_eq!(sanitize_filename("aux"), "safe_aux");
        assert!(sanitize_filename("...").starts_with("file_"));
    }

    #[tokio::test]
    async fn test_resolve_safe_file_path_security() {
        let (ws_tx, _) = broadcast::channel(10);
        let temp_dir = std::env::temp_dir();
        let safe_file = temp_dir.join("test_safe.txt");
        let _ = std::fs::write(&safe_file, "safe content");

        let state = AppState {
            active_clipboard: Arc::new(RwLock::new(String::new())),
            last_local_clip: Arc::new(RwLock::new(String::new())),
            history: Arc::new(RwLock::new(vec![
                HistoryItem {
                    id: "safe-1".into(),
                    item_type: "file".into(),
                    content: "test_safe.txt".into(),
                    size: Some(12),
                    direction: "win_to_ios".into(),
                    timestamp: 1000,
                    file_path: Some(safe_file.to_string_lossy().to_string()),
                },
                HistoryItem {
                    id: "unsafe-1".into(),
                    item_type: "file".into(),
                    content: "win.ini".into(),
                    size: Some(100),
                    direction: "win_to_ios".into(),
                    timestamp: 1001,
                    // Path pointing outside download_dir
                    file_path: Some("C:\\Windows\\win.ini".into()),
                },
            ])),
            ws_broadcast: ws_tx,
            download_dir: temp_dir,
            local_ip: Arc::new(RwLock::new("127.0.0.1".into())),
            available_ips: Arc::new(RwLock::new(vec!["127.0.0.1".into()])),
            port: 52025,
            clients: Arc::new(RwLock::new(std::collections::HashMap::new())),
        };

        // Safe file inside download_dir should succeed
        let res_safe = resolve_safe_file_path(&state, "safe-1").await;
        assert!(res_safe.is_ok());

        // File outside download_dir MUST be rejected with FORBIDDEN
        let res_unsafe = resolve_safe_file_path(&state, "unsafe-1").await;
        assert!(res_unsafe.is_err());
        let (status, _) = res_unsafe.unwrap_err();
        // Either FORBIDDEN or NOT_FOUND if win.ini does not exist, but never OK
        assert!(status == StatusCode::FORBIDDEN || status == StatusCode::NOT_FOUND);

        let _ = std::fs::remove_file(&safe_file);
    }
}
