# Project Rules - LocalDrop

## Architecture & Code Structure
- **Forbid monolithic files:** Decompose large components into single-responsibility subcomponents, custom hooks, and utilities. Target < 200 lines per UI file.
- **Frontend structure:**
  - `src/components/common/` - shared UI elements (ClickableText, Modals)
  - `src/components/dashboard/` - DesktopDashboard widgets (Header, IpSelector, QrCard, ClipboardCard, DropZone, HistoryFeed, HistoryCard)
  - `src/hooks/` - stateful logic & event subscriptions
  - `src/services/` - Tauri IPC & HTTP API adapters
  - `src/utils/` - formatting & pure helpers
- **Rust Backend:**
  - Limit RAM history to 100 items (matching disk storage).
  - Reuse `Clipboard` instance in monitor loop (no recreation every 400ms).
  - Handle Tokio `RecvError::Lagged` without dropping connections.
  - Keep Cargo dev profile optimized (`debug = 1`, `debug = 0` for deps).
