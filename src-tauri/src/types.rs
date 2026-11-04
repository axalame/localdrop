use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{broadcast, oneshot, RwLock};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryItem {
    pub id: String,
    pub item_type: String, // "clipboard" | "file"
    pub content: String,   // text content or file name
    pub size: Option<u64>,
    pub direction: String, // "win_to_ios" | "ios_to_win"
    pub timestamp: i64,    // Unix timestamp in ms
    pub file_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectedClient {
    pub id: String,
    pub client_type: String, // "mobile" | "desktop"
    pub ip: String,
    pub user_agent: String,
    pub device_name: String,
    pub connected_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum WsEvent {
    #[serde(rename = "clipboard_update")]
    ClipboardUpdate {
        content: String,
        timestamp: i64,
        source: String, // "windows" | "ios"
    },
    #[serde(rename = "file_received")]
    FileReceived {
        id: String,
        file_name: String,
        size: u64,
        timestamp: i64,
    },
    #[serde(rename = "client_count")]
    ClientCount { count: usize },
    #[serde(rename = "clients_updated")]
    ClientsUpdated { clients: Vec<ConnectedClient> },
    #[serde(rename = "history_updated")]
    HistoryUpdated { items: Vec<HistoryItem> },
    #[serde(rename = "force_disconnect")]
    ForceDisconnect { message: String },
}

#[derive(Clone)]
pub struct AppState {
    pub active_clipboard: Arc<RwLock<String>>,
    pub last_local_clip: Arc<RwLock<String>>,
    pub history: Arc<RwLock<Vec<HistoryItem>>>,
    pub ws_broadcast: broadcast::Sender<WsEvent>,
    pub download_dir: PathBuf,
    pub local_ip: Arc<RwLock<String>>,
    pub available_ips: Arc<RwLock<Vec<String>>>,
    pub port: u16,
    pub clients: Arc<RwLock<HashMap<String, (ConnectedClient, oneshot::Sender<()>)>>>,
}

impl AppState {
    pub async fn add_history_item(&self, item: HistoryItem) {
        let items_to_save = {
            let mut hist = self.history.write().await;
            hist.push(item);
            if hist.len() > crate::history::MAX_HISTORY_ITEMS {
                let excess = hist.len() - crate::history::MAX_HISTORY_ITEMS;
                hist.drain(0..excess);
            }
            hist.clone()
        };
        tokio::task::spawn_blocking(move || {
            crate::history::save_history(&items_to_save);
        });
    }

    pub async fn clear_history(&self) {
        {
            let mut hist = self.history.write().await;
            hist.clear();
        }
        tokio::task::spawn_blocking(|| {
            crate::history::save_history(&[]);
        });
    }
}


#[derive(Debug, Serialize, Deserialize)]
pub struct ServerStatus {
    pub ip: String,
    pub available_ips: Vec<String>,
    pub port: u16,
    pub active_clipboard: String,
    pub connected_clients: usize,
    pub clients: Vec<ConnectedClient>,
    pub download_dir: String,
}

#[derive(Debug, Deserialize)]
pub struct ClipboardPayload {
    pub text: String,
}

#[derive(Debug, Deserialize)]
pub struct WsQuery {
    pub client_type: Option<String>,
}
