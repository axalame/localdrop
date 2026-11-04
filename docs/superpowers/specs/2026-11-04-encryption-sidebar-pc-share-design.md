# Technical Design: XChaCha20-Poly1305 AEAD Encryption, Sidebar Categorization, and PC-to-PC Sharing

**Date:** 2026-11-04  
**Project:** LocalDrop  
**Status:** Proposed  

---

## 1. Intent and Problem Statement

LocalDrop currently transmits clipboard text and file streams over unencrypted local HTTP/WebSocket connections. While scoped to the local Wi-Fi network, this is vulnerable to local network sniffing (e.g., promiscuous mode or ARP spoofing on shared routers). Furthermore:
- The desktop user interface displays all history items in a flat feed without granular categorization, favorites, or tag filtering.
- Sharing is currently oriented around PC-to-Phone transfers; accessing the web server from a second PC in the network should provide a desktop-class experience with full browser-compatible interactions.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **End-to-End Local Transport Encryption:** Provide zero-configuration authenticated encryption between the host Axum server and any client (iOS Safari, Android Chrome, secondary desktop browsers, or native peers) using ephemeral X25519 ECDH key exchange and XChaCha20-Poly1305 AEAD.
- **Desktop Sidebar Navigation and Filtering:** Implement a modular left sidebar matching the provided specification (Russian localization):
  - Primary Views: «Все» (All), «Избранное» (Favorites).
  - TYPE («ТИП»): «Текст» (Text), «Форматированный текст» (Rich Text), «Изображение» (Image), «Файл» (File).
  - TAG («ТЕГ»): «Ссылка» (Link), «Код» (Code), «Изображение» (Image).
  - SOURCE («ИСТОЧНИК»): «Все источники» (All Sources) and dynamic list of active and historic devices.
  - TIME («ВРЕМЯ»): «За всё время» (All time), «Сегодня» (Today), «Вчера» (Yesterday), «На этой неделе» (This week).
- **Favorites Persistence:** Allow bookmarking items with a star icon, persisted in `history.json`.
- **PC-to-PC Web Sharing Parity:** Enable a second PC connecting via `http://<HOST_IP>:52025` to use full desktop features (drag-and-drop file upload, clipboard sync, streaming file download fallback, search, and categorization).

### Non-Goals
- Internet-routed cloud relaying (LocalDrop remains strictly LAN-only).
- Heavy asymmetric public key infrastructure (PKI) or manual SSL certificate installations on client phones.

### Anti-Goals
- Introducing monolithic single-file components (> 300 lines) violating repository architecture rules.
- Breaking backwards compatibility with iOS Shortcuts HTTP POST endpoints.

---

## 3. Cryptographic Architecture (Variant A: Ephemeral X25519 + XChaCha20-Poly1305 AEAD)

### Cryptographic Primitives
- **Key Exchange:** X25519 ECDH (Curve25519).
- **Key Derivation:** HKDF-SHA256 (deriving a 256-bit symmetric key with a 16-byte random salt).
- **Authenticated Encryption:** XChaCha20-Poly1305 AEAD (256-bit key, 192-bit / 24-byte nonce, 128-bit authentication tag).
- **Libraries:**
  - Rust Backend: `chacha20poly1305 = "0.10"`, `x25519-dalek = { version = "2.0", features = ["static_secrets"] }`, `rand = "0.8"`.
  - Frontend (Web/React): `@noble/ciphers` (XChaCha20-Poly1305) and `@noble/curves` (X25519) — audited, lightweight, zero-dependency pure TypeScript libraries supported across all modern browsers without WebAssembly requirements.

### Handshake and Message Protocol
1. **WebSocket Connect & Bootstrap:**
   - Client establishes WebSocket connection to `/ws`.
   - Client generates an ephemeral X25519 keypair `(sk_c, pk_c)`.
   - Client sends initial handshake frame:
     ```json
     {
       "type": "handshake_init",
       "client_pk": "<base64_encoded_32_bytes_pk>"
     }
     ```
2. **Server Handshake Response & Session Token:**
   - Server generates ephemeral keypair `(sk_s, pk_s)` and 16-byte random `salt`.
   - Server computes shared secret: `ss = X25519(sk_s, pk_c)`.
   - Server derives `session_key = HKDF_SHA256(ikm: ss, salt: salt, info: "localdrop-v1-xchacha20poly1305", length: 32)`.
   - Server generates a random ephemeral session token `auth_token` for authenticated HTTP file transfers.
   - Server sends response:
     ```json
     {
       "type": "handshake_ack",
       "server_pk": "<base64_encoded_32_bytes_pk>",
       "salt": "<base64_encoded_16_bytes>",
       "auth_token": "<base64_session_token>"
     }
     ```
3. **Encrypted Initial State Synchronization:**
   - To prevent transmitting clipboard history over unencrypted HTTP, the client does not call plaintext `GET /api/history`.
   - Immediately after the handshake, the server sends the full initial history payload inside an encrypted WebSocket frame (`history_snapshot`).
   - All subsequent real-time updates (clipboard sync, device status, file notifications) travel exclusively through AEAD-encrypted WebSocket frames:
     ```json
     {
       "type": "encrypted_envelope",
       "nonce": "<base64_24_bytes_nonce>",
       "ciphertext": "<base64_ciphertext_with_poly1305_tag>"
     }
     ```
4. **File Transfers (Zero-Friction with Session Authentication):**
   - File uploads (`POST /api/upload`) and downloads (`GET /api/download/:id`) pass the `auth_token` header/query param established via the encrypted WebSocket handshake.
   - Direct streaming with HTTP Range requests is preserved, maintaining high transfer speeds and bounded memory.
5. **Opportunistic QR Code Out-of-Band Fingerprinting:**
   - For smartphones scanning the QR code, the host's ephemeral public key fingerprint is included in the URL fragment (`http://<IP>:52025#fp=<hash>`). The phone verifies the server's public key against the fragment with zero user friction, preventing MITM attacks.
   - For secondary PCs typing the IP manually, the unauthenticated ephemeral ECDH ensures forward secrecy and complete protection against passive network eavesdropping.

---

## 4. Frontend Sidebar & Grouping Architecture

### UI Component Hierarchy
```
src/components/
├── DesktopDashboard.tsx         # Main grid container (Header + Sidebar + Content)
└── dashboard/
    ├── Header.tsx               # Status, IP selector, network indicator
    ├── SidebarFilter.tsx        # New dedicated navigation & filter component (< 200 lines)
    ├── QrCard.tsx               # Quick connection modal or collapsible card
    ├── DropZone.tsx             # File drag-and-drop zone
    ├── HistoryFeed.tsx          # Filtered feed of clipboard items & files
    └── HistoryCard.tsx          # Item card with star (favorite) toggle, tags, source badge
```

### Data Schema Extensions
In `src/types.ts` and `src-tauri/src/types.rs`:
```typescript
export interface HistoryItem {
  id: string;
  item_type: 'clipboard' | 'file';
  content: string;
  size?: number;
  direction: 'win_to_ios' | 'ios_to_win';
  timestamp: number;
  file_path?: string;
  is_favorite?: boolean;
  device_name?: string;
  content_type: 'text' | 'rich_text' | 'image' | 'file';
  tags: ('link' | 'code' | 'image')[];
}
```

### Filtering Interaction & Selection Model
- The sidebar provides an intuitive, single-click filter system (matching the screenshot reference):
  - **Navigation:**
    - «Все» (All) — displays all items.
    - «Избранное» (Favorites) — displays only starred items (`is_favorite == true`).
  - **ТИП:**
    - «Текст» — plain single/dual-line text.
    - «Форматированный текст» — multiline text, formatted blocks, markdown.
    - «Изображение» — image files (PNG, JPG, WebP, GIF, SVG).
    - «Файл» — all non-image files (documents, archives, etc.).
  - **ТЕГ:**
    - «Ссылка» — items containing URLs (`http://`, `https://`).
    - «Код» — items detected as code snippets, JSON, or SQL.
    - «Изображение» — media items tagged with visual media.
  - **ИСТОЧНИК:**
    - «Все источники» — all devices.
    - List of distinct devices (e.g., `DESKTOP-HIC7...`, `Mi 11`, `iPhone 15`).
  - **ВРЕМЯ:**
    - «За всё время» — no time boundary.
    - «Сегодня» — items created since 00:00 local time.
    - «Вчера» — items created between yesterday 00:00 and 23:59.
    - «На этой неделе» — items created within the last 7 days.
- When any item in the sidebar is clicked, it becomes the active filter and the history feed updates instantly with count badges. Multiple filters can be combined cleanly.

---

## 5. PC-to-PC Web Client Parity

When opened on a second computer in Chrome, Edge, or Firefox (`!isTauri`):
1. **Desktop View Trigger:** `App.tsx` renders `DesktopDashboard` when `!isMobileDevice`.
2. **File Download Seam:**
   - In Tauri desktop: `openPath(file_path)`.
   - In Browser desktop: triggers direct streaming download via `<a href="/api/download/:id" download>`.
3. **Clipboard Paste & Copy:**
   - In Browser desktop: uses standard `navigator.clipboard.writeText()` and clipboard permission API.
4. **Drag & Drop:**
   - In Browser desktop: HTML5 native `onDrop` events stream selected files to `/api/upload`.
5. **Device Naming:**
   - In Browser desktop: client sends user agent / OS info (e.g. `Chrome (Windows)` or `Firefox (macOS)`).

---

## 6. Verification and Quality Criteria

- **Rust Backend:**
  - Unit tests for X25519 key derivation and XChaCha20-Poly1305 encryption/decryption round-trip.
  - Zero memory leaks, bounded collections maintained (< 100 items).
  - `cargo test --manifest-path src-tauri/Cargo.toml` passing with 0 errors.
- **Frontend:**
  - TypeScript compilation `npm run build` passing with 0 errors.
  - Linter `npm run lint` passing with 0 warnings.
- **Repository Cleanliness:**
  - Strict compliance with `AGENTS.md` (no junk files, no emojis in docs).
