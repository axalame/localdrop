use crate::types::HistoryItem;
use directories::ProjectDirs;
use std::fs;
use std::path::PathBuf;

fn get_storage_path() -> PathBuf {
    if let Some(proj_dirs) = ProjectDirs::from("com", "localdrop", "LocalDrop") {
        let config_dir = proj_dirs.data_dir();
        let _ = fs::create_dir_all(config_dir);
        config_dir.join("history.json")
    } else {
        PathBuf::from("history.json")
    }
}

pub const MAX_HISTORY_ITEMS: usize = 100;

pub fn load_history() -> Vec<HistoryItem> {
    let path = get_storage_path();
    if path.exists() {
        if let Ok(data) = fs::read_to_string(&path) {
            if let Ok(mut items) = serde_json::from_str::<Vec<HistoryItem>>(&data) {
                if items.len() > MAX_HISTORY_ITEMS {
                    let excess = items.len() - MAX_HISTORY_ITEMS;
                    items.drain(0..excess);
                }
                return items;
            }
        }
    }
    Vec::new()
}

pub fn save_history(items: &[HistoryItem]) {
    let path = get_storage_path();
    // Keep last MAX_HISTORY_ITEMS entries to prevent infinite growth
    let slice = if items.len() > MAX_HISTORY_ITEMS {
        &items[items.len() - MAX_HISTORY_ITEMS..]
    } else {
        items
    };
    if let Ok(data) = serde_json::to_string_pretty(slice) {
        let _ = fs::write(path, data);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_history_cap_logic() {
        let mut items: Vec<HistoryItem> = Vec::new();
        for i in 0..150 {
            let item = HistoryItem::new(
                format!("id-{}", i),
                "clipboard".to_string(),
                format!("text-{}", i),
                None,
                "win_to_ios".to_string(),
                1000 + i as i64,
                None,
            );
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
        let items = vec![HistoryItem::new(
            "123".to_string(),
            "clipboard".to_string(),
            "hello world".to_string(),
            None,
            "ios_to_win".to_string(),
            1700000000,
            None,
        )];

        let json = serde_json::to_string(&items).unwrap();
        let deserialized: Vec<HistoryItem> = serde_json::from_str(&json).unwrap();
        assert_eq!(items[0].id, deserialized[0].id);
        assert_eq!(items[0].content, deserialized[0].content);
    }
}

