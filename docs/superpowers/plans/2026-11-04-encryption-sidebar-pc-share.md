# XChaCha20-Poly1305 AEAD Encryption, Sidebar Grouping, and PC-to-PC Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement zero-configuration X25519 ECDH + XChaCha20-Poly1305 AEAD transport encryption for WebSocket communication, a Russian-localized multi-category sidebar filter (All, Favorites, Type, Tag, Source, Time) matching the native UI reference, and full PC-to-PC browser sharing parity.

**Architecture:** A lightweight cryptographic layer is added to the Axum WebSocket handler and React client to perform an ephemeral X25519 Diffie-Hellman handshake on connection and wrap all real-time events and clipboard history in XChaCha20-Poly1305 AEAD envelopes. The frontend dashboard decomposes into a dedicated `SidebarFilter` component driving active filters across expanded history item metadata (favorites, content types, tags, devices, timestamps), while browser-based PC clients get native download fallbacks and drag-and-drop file transfers.

**Tech Stack:** Rust (`x25519-dalek 2.0`, `chacha20poly1305 0.10`, `rand 0.8`), TypeScript / React 19 (`@noble/ciphers`, `@noble/curves`), Tailwind CSS v4, Axum 0.8, Tauri v2.

**Spec:** `docs/superpowers/specs/2026-11-04-encryption-sidebar-pc-share-design.md`

## Global Constraints

- **Strict No-Monolith Rule:** UI components must remain under 200 lines (hard ceiling 300 lines). `SidebarFilter.tsx` must be a self-contained component.
- **Repository Cleanliness:** No `.bat`, `.cmd`, `.sh`, `.ps1`, build dumps, or test scripts committed to repository.
- **Strict README & Docs:** Zero emojis in `README.md` and documentation files. Formal engineering tone.
- **Bounded Resources:** In-memory history buffer strictly bounded to 100 items. Zero memory leaks on WebSocket disconnects.
- **Zero Regressions:** Parity maintained between native Tauri desktop window, mobile Safari view, and desktop browser view.

## Review Focus

1. **Legacy `history.json` Deserialization:** History files saved before schema expansion missing `is_favorite`, `content_type`, or `tags` must deserialize with default values without corrupting existing records.
2. **WebSocket Handshake Timeout or Dropout:** If a client disconnects mid-handshake or sends invalid base64 public keys, the server must close the socket gracefully without thread panics or hanging locks.
3. **Poly1305 Tag Verification Failure:** If ciphertext is tampered with or decrypted with an invalid key/nonce, the decryption failure must reject the message and log a warning without crashing the connection or server.
4. **Browser Clipboard Permissions:** On secondary PC browsers where `navigator.clipboard` requires user gesture or permission, fallbacks must notify the user cleanly without unhandled promise rejections.
5. **Streaming Download Fallback on Browser:** Secondary PC clients without Tauri OS APIs (`openPath`) must download files cleanly via standard HTTP streaming links (`/api/download/:id`).

---

### Task 1: Extended History Data Model & Content Classification Engine

**Files:**
- Create: `src/utils/classification.ts`
- Create: `tests/classification.test.mjs`
- Modify: `src-tauri/src/types.rs`
- Modify: `src/types.rs`
- Modify: `src-tauri/src/history.rs`

**Interfaces:**
- Consumes: Raw text or file metadata from clipboard and uploads.
- Produces:
  - TypeScript: `classifyContent(content: string, itemType: 'clipboard' | 'file'): { contentType: 'text' | 'rich_text' | 'image' | 'file', tags: ('link' | 'code' | 'image')[] }`
  - Rust: `HistoryItem` with optional `is_favorite: bool`, `content_type: String`, `tags: Vec<String>`, `device_name: Option<String>` with `#[serde(default)]` annotations.

- [ ] **Step 1: Write failing Node test for content classifier**
  In `tests/classification.test.mjs`:
  Verify URL detection tags (`http://...`, `https://...` -> `tags: ['link']`), code snippet detection (`function () { ... }`, `{ "json": true }` -> `tags: ['code']`), multiline text -> `contentType: 'rich_text'`, image extensions -> `contentType: 'image'`, default text -> `contentType: 'text'`.

- [ ] **Step 2: Run classifier test to verify it fails**
  Run: `node tests/classification.test.mjs`
  Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/utils/classification.ts`**
  Implement `classifyContent(content: string, itemType: 'clipboard' | 'file')` with regexes for URL, code syntax, image extensions (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`), and line count.

- [ ] **Step 4: Update Rust and TypeScript data types with backward compatibility**
  In `src-tauri/src/types.rs` and `src/types.rs`, add `is_favorite: Option<bool>`, `content_type: Option<String>`, `tags: Option<Vec<String>>`, `device_name: Option<String>` with `#[serde(default)]`.
  In `src-tauri/src/history.rs`, add favorite toggle endpoint helper `AppState::toggle_favorite(id: &str) -> Option<bool>`.

- [ ] **Step 5: Run tests and verify they pass**
  Run: `node tests/classification.test.mjs` and `cargo test --manifest-path src-tauri/Cargo.toml`
  Expected: PASS with 0 errors.

- [ ] **Step 6: Commit**
  ```bash
  git add src/types.ts src-tauri/src/types.rs src/utils/classification.ts tests/classification.test.mjs src-tauri/src/history.rs
  git commit -m "feat: add content classification engine and extended history schema with favorites"
  ```

---

### Task 2: Backend X25519 ECDH + XChaCha20-Poly1305 Cryptographic Engine

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/crypto.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `src-tauri/tests/crypto_test.rs`

**Interfaces:**
- Produces:
  - `CryptoSession::new() -> CryptoSession`
  - `CryptoSession::public_key_base64(&self) -> String`
  - `CryptoSession::derive_shared_key(&mut self, peer_public_key_base64: &str, salt: &[u8]) -> Result<(), CryptoError>`
  - `CryptoSession::encrypt(&self, plaintext: &[u8]) -> Result<(String, String), CryptoError>` (returns base64 nonce, base64 ciphertext)
  - `CryptoSession::decrypt(&self, nonce_b64: &str, ciphertext_b64: &str) -> Result<Vec<u8>, CryptoError>`

- [ ] **Step 1: Add crypto dependencies to `src-tauri/Cargo.toml`**
  Add `chacha20poly1305 = "0.10"`, `x25519-dalek = { version = "2.0", features = ["static_secrets"] }`, `sha2 = "0.10"`, `hkdf = "0.12"`.

- [ ] **Step 2: Write failing Rust integration test for crypto session**
  In `src-tauri/tests/crypto_test.rs`:
  Simulate two peers (Client and Server). Verify key exchange, shared key derivation, message encryption, decryption round-trip, and Poly1305 failure on modified ciphertext.

- [ ] **Step 3: Run Rust test to verify it fails**
  Run: `cargo test --test crypto_test --manifest-path src-tauri/Cargo.toml`
  Expected: FAIL (`crypto` module not found).

- [ ] **Step 4: Implement `src-tauri/src/crypto.rs`**
  Implement `CryptoSession` using `x25519_dalek::StaticSecret`, `hkdf::Hkdf<sha2::Sha256>`, and `chacha20poly1305::XChaCha20Poly1305`.

- [ ] **Step 5: Run Rust crypto tests and verify they pass**
  Run: `cargo test --test crypto_test --manifest-path src-tauri/Cargo.toml`
  Expected: PASS with 0 errors.

- [ ] **Step 6: Commit**
  ```bash
  git add src-tauri/Cargo.toml src-tauri/src/crypto.rs src-tauri/src/lib.rs src-tauri/tests/crypto_test.rs
  git commit -m "feat: implement X25519 ECDH and XChaCha20-Poly1305 AEAD session engine in Rust"
  ```

---

### Task 3: Backend Encrypted WebSocket Handshake & Framing in Axum

**Files:**
- Modify: `src-tauri/src/server.rs`

**Interfaces:**
- Consumes: `CryptoSession` from `crypto.rs`, `AppState`.
- Produces:
  - WebSocket protocol handler supporting `handshake_init` -> `handshake_ack`.
  - Encrypted frame envelope wrapping and unwrapping (`encrypted_envelope`).
  - Protected initial history snapshot sent over WebSocket rather than plaintext HTTP.

- [ ] **Step 1: Modify `src-tauri/src/server.rs` to support encrypted WS handshake**
  In `handle_socket`:
  - Await initial message. If it is `handshake_init`, generate server `CryptoSession` and 16-byte random salt, derive session key, and respond with `handshake_ack` containing server public key and salt.
  - Send initial `history_snapshot` inside an `encrypted_envelope`.
  - For outgoing broadcast messages (`WsEvent`), encrypt using `crypto.encrypt()`.
  - For incoming frames from client, decrypt `encrypted_envelope` and parse inner JSON.

- [ ] **Step 2: Add REST endpoint for toggling favorites**
  In `src-tauri/src/server.rs`:
  Add `POST /api/history/favorite` route: receives `{"id": "uuid"}`, updates `is_favorite` in `AppState`, persists to disk, and broadcasts `history_updated` event.

- [ ] **Step 3: Run full Rust backend tests**
  Run: `cargo test --manifest-path src-tauri/Cargo.toml`
  Expected: PASS with all tests green.

- [ ] **Step 4: Commit**
  ```bash
  git add src-tauri/src/server.rs
  git commit -m "feat: integrate XChaCha20-Poly1305 AEAD handshake and framing into Axum WebSocket server"
  ```

---

### Task 4: Frontend Cryptography & Encrypted WebSocket Client

**Files:**
- Modify: `package.json`
- Create: `src/services/crypto.ts`
- Modify: `src/services/api.ts`
- Create: `tests/crypto.test.mjs`

**Interfaces:**
- Produces:
  - `initCryptoSession(): Promise<{ clientPublicKeyB64: string, deriveSharedKey(serverPkB64: string, saltB64: string): void, encrypt(plaintext: string): { nonce: string, ciphertext: string }, decrypt(nonce: string, ciphertext: string): string }>`
  - Encrypted WebSocket connection in `api.ts` maintaining transparent message encryption.

- [ ] **Step 1: Install `@noble/ciphers` and `@noble/curves`**
  Run: `npm.cmd install @noble/ciphers @noble/curves`

- [ ] **Step 2: Write failing test for frontend crypto session**
  In `tests/crypto.test.mjs`:
  Test X25519 key exchange, HKDF key derivation, and XChaCha20-Poly1305 encryption/decryption matching standard vectors.

- [ ] **Step 3: Run test to verify it fails**
  Run: `node tests/crypto.test.mjs`
  Expected: FAIL.

- [ ] **Step 4: Implement `src/services/crypto.ts`**
  Using `@noble/curves/ed25519` (x25519) and `@noble/ciphers/chacha` (xchacha20poly1305).

- [ ] **Step 5: Integrate encrypted handshake in `src/services/api.ts`**
  Update `connectWebSocket`:
  On open, send `handshake_init`. On `handshake_ack`, derive session key, mark session as encrypted, and decrypt incoming `encrypted_envelope` messages before passing to event listeners.

- [ ] **Step 6: Run frontend tests and verify pass**
  Run: `node tests/crypto.test.mjs`
  Expected: PASS.

- [ ] **Step 7: Commit**
  ```bash
  git add package.json package-lock.json src/services/crypto.ts src/services/api.ts tests/crypto.test.mjs
  git commit -m "feat: implement frontend X25519 and XChaCha20-Poly1305 AEAD client"
  ```

---

### Task 5: Sidebar Filter Component (`SidebarFilter.tsx`)

**Files:**
- Create: `src/components/dashboard/SidebarFilter.tsx`
- Modify: `src/hooks/useDashboardState.ts`
- Modify: `src/components/dashboard/HistoryFeed.tsx`
- Modify: `src/components/dashboard/HistoryCard.tsx`
- Modify: `tests/formatters.test.mjs`

**Interfaces:**
- Consumes: `history: HistoryItem[]`, filter states from `useDashboardState`.
- Produces:
  - `SidebarFilter`: self-contained sidebar (< 200 lines) with Russian labels:
    - «Все», «Избранное»
    - «ТИП» (Текст, Форматированный текст, Изображение, Файл)
    - «ТЕГ» (Ссылка, Код, Изображение)
    - «ИСТОЧНИК» (Все источники, список устройств)
    - «ВРЕМЯ» (За всё время, Сегодня, Вчера, На этой неделе)
  - Card favorite toggle button (`handleToggleFavorite(id: string)`).

- [ ] **Step 1: Write unit tests for sidebar filtering logic**
  In `tests/formatters.test.mjs`:
  Test filtering by category, content type, tag, source device, and timestamp boundaries.

- [ ] **Step 2: Update `src/hooks/useDashboardState.ts`**
  Add state:
  `activeCategory`, `selectedType`, `selectedTag`, `selectedSource`, `selectedTime`.
  Add `handleToggleFavorite(id: string)` calling `/api/history/favorite`.
  Compute `filteredHistory` matching all active criteria.

- [ ] **Step 3: Implement `src/components/dashboard/SidebarFilter.tsx`**
  Build the sidebar with Tailwind CSS v4 matching the screenshot style (compact, clean dark theme, active states, item count badges, Russian labels). Keep under 200 lines.

- [ ] **Step 4: Update `HistoryCard.tsx`**
  Add star favorite toggle button and device name badge.

- [ ] **Step 5: Run tests and linter**
  Run: `node tests/formatters.test.mjs` and `npm.cmd run lint`
  Expected: PASS with 0 warnings.

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/dashboard/SidebarFilter.tsx src/hooks/useDashboardState.ts src/components/dashboard/HistoryFeed.tsx src/components/dashboard/HistoryCard.tsx tests/formatters.test.mjs
  git commit -m "feat: implement Russian sidebar filter with categories, tags, sources, and favorites"
  ```

---

### Task 6: Desktop Layout Integration & PC-to-PC Web Client Parity

**Files:**
- Modify: `src/components/DesktopDashboard.tsx`
- Modify: `src/services/api.ts`
- Modify: `src/App.tsx`
- Modify: `README.md` (documenting XChaCha20-Poly1305 AEAD and PC-to-PC browser sharing)

**Interfaces:**
- Consumes: `SidebarFilter`, `DesktopDashboard`.
- Produces:
  - Unified desktop grid layout featuring the left navigation sidebar.
  - Browser-compatible fallback for file downloading (`/api/download/:id`).
  - Encryption status indicator badge in the header («Защищено: XChaCha20-Poly1305»).

- [ ] **Step 1: Integrate `SidebarFilter` into `DesktopDashboard.tsx`**
  Reorganize layout into clean 3-part layout:
  - Left column: `SidebarFilter` (collapsible/responsive) + mini host connection status.
  - Main area: `DropZone`, Quick Send, and `HistoryFeed`.
  - Header: Displays "Защищено: XChaCha20-Poly1305 AEAD" badge and connected devices.

- [ ] **Step 2: Add browser-compatible download fallback**
  In `DesktopDashboard.tsx` / `HistoryFeed.tsx`:
  When running in a regular browser on a second PC (`!isTauri`), clicking download uses streaming HTTP endpoint `/api/download/:id`.

- [ ] **Step 3: Update `README.md`**
  Document the XChaCha20-Poly1305 AEAD encryption layer and PC-to-PC browser sharing in strict technical language with zero emojis.

- [ ] **Step 4: Verify full project compilation and test suites**
  Run:
  - `npm.cmd run lint` -> 0 warnings
  - `npm.cmd run build` -> 0 errors
  - `cargo test --manifest-path src-tauri/Cargo.toml` -> all tests pass

- [ ] **Step 5: Commit and Push**
  ```bash
  git add src/components/DesktopDashboard.tsx src/services/api.ts src/App.tsx README.md
  git commit -m "feat: finalize desktop layout integration, browser sharing parity, and documentation"
  git push origin main
  ```
