# LocalDrop Architecture & Engineering Guidelines

This document defines the mandatory architectural rules and coding standards for the LocalDrop project (Tauri v2 + React 19 + TypeScript + Rust Axum backend).

---

## 1. Modular Architecture Over Monoliths (Strict Rule)

**Forbid monolithic "all-in-one-file" design.** No single file may act as an agglomeration of UI markup, business logic, network calls, state management, and helper functions.

### File Size Limits & Responsibility
- **UI Components:** Target under 200 lines (hard ceiling: 300 lines). If a component exceeds this, break it down immediately into subcomponents, hooks, or utility modules.
- **Single Responsibility Principle (SRP):** Each file must have one clear reason to change.
  - Modals, cards, navigation bars, and inputs must reside in dedicated component files.
  - Stateful side-effects, subscriptions (WebSocket, clipboard polling), and window events must reside in dedicated custom hooks (`src/hooks/`).
  - Network requests and Tauri invocations must reside in dedicated service modules (`src/services/`).
  - Formatting, text parsing, and pure functions must reside in utility modules (`src/utils/`).

### Directory Conventions
```
src/
├── components/
│   ├── common/           # Generic, reusable UI primitives (e.g. ClickableText, Modals)
│   ├── dashboard/        # DesktopDashboard subcomponents (Header, Cards, DropZone, Feed)
│   └── mobile/           # MobileView subcomponents
├── hooks/                # Custom React hooks (useDashboardState, useWindowPaste, etc.)
├── services/             # API clients, Tauri IPC adapters, WebSocket client
├── utils/                # Pure helper functions (formatters, url helpers)
└── types.ts              # Shared TypeScript definitions
```

---

## 2. Memory & Resource Discipline

### Rust Backend
1. **Bounded Collections:** Never allow unbounded in-memory storage. All queues, caches, and history buffers (e.g., `AppState::history`) MUST be bounded by a fixed ceiling (e.g. max 100 items), matching persistent disk storage.
2. **Zero-Copy & Streaming File Serving:** Never buffer entire files into RAM using `fs::read` in HTTP endpoints. Always stream file responses chunk by chunk using `ServeFile` with HTTP Range request support to prevent OOM on large files/videos.
3. **Reuse Heavy OS Resources & Check Sequence:** Never reallocate OS handles or COM objects in rapid polling loops. On Windows, check `GetClipboardSequenceNumber` before inspecting clipboard contents to eliminate CPU and multi-megabyte bitmap decoding overhead.
4. **Security & Path Traversal Prevention:** Always canonicalize paths and verify `canonical_path.starts_with(&canonical_download_dir)` before serving files. Sanitize multipart filenames against illegal characters and DOS device names (`CON`, `NUL`, etc.). Keep JSON body limits bounded (e.g. 10MB) while scoping large limits only to file upload routes.
5. **Non-Blocking I/O:** Never execute synchronous disk writes while holding async write locks. Release state locks immediately and offload disk persistence to `tokio::task::spawn_blocking`.
6. **Resilient Streaming & Channels:** In Tokio broadcast channels, handle `RecvError::Lagged` explicitly so that dropped messages under high load do not prematurely terminate client connections.
7. **Compile-Time Footprint:** Maintain optimized Cargo dev profiles (`debug = 1` for local crates, `debug = 0` / `opt-level = 2` for external dependencies) to prevent target directory bloat.

### Frontend
1. **Proper Hook Cleanup:** Every event listener (`paste`, `keydown`, `dragdrop`), WebSocket, and timeout must have an explicit cleanup return in `useEffect`.
2. **Prevent Dependency Cycles:** Never reference callback functions or state setters during their own initialization. Maintain clean dependency arrays without missing dependencies or cascading re-renders.
3. **Object URL Cleanup:** Revoke temporary blob/image URLs when components unmount or previews close to prevent browser memory leaks.

---

## 3. Surgical Changes & Zero Regressions

- Match existing formatting, types, and styling (Tailwind CSS v4).
- Verify type safety (`npm run build` / `tsc -b`) and linter checks (`npm run lint` / `oxlint`) before concluding work.
- Maintain seamless parity between native Tauri desktop execution and mobile browser view.
