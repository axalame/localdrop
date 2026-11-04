use crate::types::{AppState, HistoryItem, WsEvent};
use arboard::Clipboard;
use chrono::Utc;
use std::time::Duration;
use tokio::runtime::Handle;
use uuid::Uuid;

pub fn set_system_clipboard(text: &str) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text).map_err(|e| e.to_string())?;
    Ok(())
}

/// Computes a fast hash over image dimensions and sampled pixel bytes.
fn hash_image(bytes: &[u8], width: usize, height: usize) -> u64 {
    let mut h: u64 = 0xcbf29ce484222325;
    h = h.wrapping_mul(0x100000001b3) ^ (width as u64);
    h = h.wrapping_mul(0x100000001b3) ^ (height as u64);
    h = h.wrapping_mul(0x100000001b3) ^ (bytes.len() as u64);
    if !bytes.is_empty() {
        let step = (bytes.len() / 256).max(1);
        for &b in bytes.iter().step_by(step) {
            h = (h ^ (b as u64)).wrapping_mul(0x100000001b3);
        }
    }
    h
}

/// Reads image from clipboard if present.
pub fn get_clipboard_image() -> Option<(Vec<u8>, usize, usize)> {
    if let Ok(mut clip) = Clipboard::new() {
        if let Ok(img) = clip.get_image() {
            if img.width > 0 && img.height > 0 && !img.bytes.is_empty() {
                return Some((img.bytes.to_vec(), img.width, img.height));
            }
        }
    }
    None
}

/// Saves image currently in clipboard to download directory as PNG,
/// adds it to history, and broadcasts to WebSocket clients.
pub async fn save_clipboard_image_entry(state: &AppState) -> Result<Option<HistoryItem>, String> {
    let img_data = get_clipboard_image();
    if let Some((bytes, width, height)) = img_data {
        if let Some(rgba) = image::RgbaImage::from_raw(width as u32, height as u32, bytes) {
            let filename = format!("screenshot_{}.png", Utc::now().format("%Y%m%d_%H%M%S"));
            let file_path = state.download_dir.join(&filename);

            if let Err(e) = rgba.save(&file_path) {
                return Err(format!("Failed to save screenshot image: {}", e));
            }

            let size = std::fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0);
            let now = Utc::now().timestamp_millis();
            let item = HistoryItem {
                id: Uuid::new_v4().to_string(),
                item_type: "file".to_string(),
                content: filename.clone(),
                size: Some(size),
                direction: "win_to_ios".to_string(),
                timestamp: now,
                file_path: Some(file_path.to_string_lossy().to_string()),
            };

            state.add_history_item(item.clone()).await;
            {
                let mut cur = state.active_clipboard.write().await;
                *cur = format!("📷 Скриншот: {}", filename);
            }

            let _ = state.ws_broadcast.send(WsEvent::FileReceived {
                id: item.id.clone(),
                file_name: item.content.clone(),
                size: item.size.unwrap_or(0),
                timestamp: item.timestamp,
            });
            return Ok(Some(item));
        }
    }
    Ok(None)
}

#[cfg(target_os = "windows")]
fn get_clipboard_sequence() -> Option<u32> {
    None
}

#[cfg(not(target_os = "windows"))]
fn get_clipboard_sequence() -> Option<u32> {
    None
}

pub fn start_clipboard_monitor(state: AppState, handle: Handle) {
    std::thread::spawn(move || {
        let mut last_seen_text = String::new();
        let mut last_seen_img_hash: u64 = 0;
        let mut last_seq: u32 = get_clipboard_sequence().unwrap_or(0);
        let mut clip_opt = Clipboard::new().ok();

        // Initial snapshot to avoid re-capturing pre-existing data
        if let Some(clip) = clip_opt.as_mut() {
            if let Ok(text) = clip.get_text() {
                if !text.trim().is_empty() {
                    last_seen_text = text.clone();
                    let text_clone = text.clone();
                    let state_clone = state.clone();
                    handle.block_on(async move {
                        let mut cur = state_clone.active_clipboard.write().await;
                        *cur = text_clone.clone();
                        let mut last = state_clone.last_local_clip.write().await;
                        *last = text_clone;
                    });
                }
            }
            if let Ok(img) = clip.get_image() {
                if img.width > 0 && img.height > 0 && !img.bytes.is_empty() {
                    last_seen_img_hash = hash_image(&img.bytes, img.width, img.height);
                }
            }
        }

        loop {
            std::thread::sleep(Duration::from_millis(400));

            // On Windows, if the OS clipboard sequence number is unchanged,
            // no new content has been copied. Skip polling to avoid
            // decoding multi-megabyte image bitmaps (30+ MB on 4K) every 400ms.
            let current_seq = get_clipboard_sequence();
            if let Some(seq) = current_seq {
                if seq != 0 && seq == last_seq {
                    continue;
                }
            }

            // Lazily re-open clipboard only if not available
            if clip_opt.is_none() {
                clip_opt = Clipboard::new().ok();
            }

            let clip = match clip_opt.as_mut() {
                Some(c) => c,
                None => continue,
            };

            // 1. Check for text updates
            if let Ok(text) = clip.get_text() {
                if !text.is_empty() && text != last_seen_text {
                    let is_our_own = handle.block_on(async {
                        let last = state.last_local_clip.read().await;
                        *last == text
                    });

                    if is_our_own {
                        last_seen_text = text;
                    } else {
                        last_seen_text = text.clone();

                        let state_clone = state.clone();
                        let text_clone = text.clone();
                        handle.block_on(async move {
                            {
                                let mut cur = state_clone.active_clipboard.write().await;
                                *cur = text_clone.clone();
                            }
                            {
                                let mut last = state_clone.last_local_clip.write().await;
                                *last = text_clone.clone();
                            }
                            let now = Utc::now().timestamp_millis();
                            let item = HistoryItem {
                                id: Uuid::new_v4().to_string(),
                                item_type: "clipboard".to_string(),
                                content: text_clone.clone(),
                                size: None,
                                direction: "win_to_ios".to_string(),
                                timestamp: now,
                                file_path: None,
                            };
                            state_clone.add_history_item(item).await;
                            let _ = state_clone.ws_broadcast.send(WsEvent::ClipboardUpdate {
                                content: text_clone,
                                timestamp: now,
                                source: "windows".to_string(),
                            });
                        });
                    }
                }
            }

            // 2. Check for screenshot / image updates (e.g. Win+Shift+S)
            if let Ok(img) = clip.get_image() {
                if img.width > 0 && img.height > 0 && !img.bytes.is_empty() {
                    let current_hash = hash_image(&img.bytes, img.width, img.height);
                    if current_hash != last_seen_img_hash {
                        last_seen_img_hash = current_hash;

                        // Convert and save screenshot image
                        if let Some(rgba) = image::RgbaImage::from_raw(
                            img.width as u32,
                            img.height as u32,
                            img.bytes.to_vec(),
                        ) {
                            let filename = format!(
                                "screenshot_{}.png",
                                Utc::now().format("%Y%m%d_%H%M%S")
                            );
                            let file_path = state.download_dir.join(&filename);

                            if rgba.save(&file_path).is_ok() {
                                let size = std::fs::metadata(&file_path)
                                    .map(|m| m.len())
                                    .unwrap_or(0);
                                let now = Utc::now().timestamp_millis();
                                let item = HistoryItem {
                                    id: Uuid::new_v4().to_string(),
                                    item_type: "file".to_string(),
                                    content: filename.clone(),
                                    size: Some(size),
                                    direction: "win_to_ios".to_string(),
                                    timestamp: now,
                                    file_path: Some(file_path.to_string_lossy().to_string()),
                                };

                                let state_clone = state.clone();
                                handle.block_on(async move {
                                    state_clone.add_history_item(item.clone()).await;
                                    {
                                        let mut cur = state_clone.active_clipboard.write().await;
                                        *cur = format!("📷 Скриншот: {}", filename);
                                    }
                                    let _ = state_clone.ws_broadcast.send(WsEvent::FileReceived {
                                        id: item.id.clone(),
                                        file_name: item.content.clone(),
                                        size: item.size.unwrap_or(0),
                                        timestamp: item.timestamp,
                                    });
                                });
                            }
                        }
                    }
                }
            }

            if let Some(seq) = current_seq {
                last_seq = seq;
            }
        }
    });
}
