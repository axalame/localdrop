use serde::{Deserialize, Serialize};

pub const MAX_HISTORY_ITEMS: usize = 100;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct HistoryItem {
    pub id: String,
    pub item_type: String,
    pub content: String,
    pub size: Option<u64>,
    pub direction: String,
    pub timestamp: i64,
    pub file_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum WsEvent {
    #[serde(rename = "clipboard_update")]
    ClipboardUpdate {
        content: String,
        timestamp: i64,
        source: String,
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
    #[serde(rename = "history_updated")]
    HistoryUpdated { items: Vec<HistoryItem> },
}

pub fn sanitize_filename_test(name: &str) -> String {
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
        return format!("file_{}.bin", uuid::Uuid::new_v4());
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

#[test]
fn test_history_cap_logic() {
    let mut items: Vec<HistoryItem> = Vec::new();
    for i in 0..150 {
        let item = HistoryItem {
            id: format!("id-{}", i),
            item_type: "clipboard".to_string(),
            content: format!("text-{}", i),
            size: None,
            direction: "win_to_ios".to_string(),
            timestamp: 1000 + i as i64,
            file_path: None,
        };
        items.push(item);
        if items.len() > MAX_HISTORY_ITEMS {
            let excess = items.len() - MAX_HISTORY_ITEMS;
            items.drain(0..excess);
        }
    }
    assert_eq!(items.len(), 100);
    assert_eq!(items[0].content, "text-50");
    assert_eq!(items[99].content, "text-149");
}

#[test]
fn test_history_serialization() {
    let items = vec![HistoryItem {
        id: "123".to_string(),
        item_type: "clipboard".to_string(),
        content: "hello world".to_string(),
        size: None,
        direction: "ios_to_win".to_string(),
        timestamp: 1700000000,
        file_path: None,
    }];

    let json = serde_json::to_string(&items).unwrap();
    let deserialized: Vec<HistoryItem> = serde_json::from_str(&json).unwrap();
    assert_eq!(items, deserialized);
}

#[test]
fn test_ws_event_serialization() {
    let event = WsEvent::ClipboardUpdate {
        content: "test clip".to_string(),
        timestamp: 123456,
        source: "windows".to_string(),
    };
    let json = serde_json::to_string(&event).unwrap();
    assert!(json.contains("\"type\":\"clipboard_update\""));
    assert!(json.contains("\"content\":\"test clip\""));
}

#[test]
fn test_filename_sanitization() {
    assert_eq!(sanitize_filename_test("../../etc/passwd"), "passwd");
    assert_eq!(sanitize_filename_test("C:\\Windows\\System32\\cmd.exe"), "cmd.exe");
    assert_eq!(sanitize_filename_test("test:file*name?.txt"), "test_file_name_.txt");
    assert_eq!(sanitize_filename_test("CON.txt"), "safe_CON.txt");
    assert_eq!(sanitize_filename_test("NUL"), "safe_NUL");
    assert_eq!(sanitize_filename_test("com1.png"), "safe_com1.png");
    let fallback = sanitize_filename_test("...");
    assert!(fallback.starts_with("file_"));
}
