# Mobile Upload Source Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an explicit upload source modal on mobile to enable opening the native Android/iOS photo gallery picker (`accept="image/*,video/*"`) or full document file manager (`*/*`).

**Architecture:** Create a dedicated modular component `MobileUploadSourceModal` rendered conditionally by `MobileFileUploader`. Maintain two hidden file inputs (one scoped to media formats, one unrestricted) triggered programmatically upon option selection.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide React icons (`Image`, `FolderOpen`, `X`).

**Spec:** docs/superpowers/specs/2026-11-10-mobile-upload-source-modal-design.md

## Global Constraints
- Strictly avoid monolithic files: UI components must remain under 200 lines (hard ceiling 300 lines).
- Modular architecture: Modals and subcomponents must reside in dedicated files under `src/components/mobile/`.
- No emojis in code or documentation files.
- Never run automatic `git commit` or `git push` without explicit user permission.
- Code must pass `oxlint` and TypeScript compilation (`npm run build`).

## Review Focus
- Touch and tap target responsiveness on mobile devices with proper active/hover styles.
- File input value reset to ensure re-selecting identical files triggers `onChange`.
- Modal dismissal on backdrop tap or cancel button.
- Clean cleanup of any modal state during component unmounting.
- Cross-platform compatibility for both Android (Chrome/Samsung Internet) and iOS (Safari).

---

### Task 1: Create MobileUploadSourceModal Component

**Files:**
- Create: `src/components/mobile/MobileUploadSourceModal.tsx`

- [ ] Define `MobileUploadSourceModalProps` interface (`isOpen`, `onClose`, `onSelectMedia`, `onSelectAllFiles`).
- [ ] Implement slide-up bottom sheet / centered dialog with animated dark backdrop (`bg-black/60`).
- [ ] Add option button for "Галерея (Фото и видео)" using Lucide `Image` icon and descriptive subtitle.
- [ ] Add option button for "Все файлы и документы" using Lucide `FolderOpen` icon and descriptive subtitle.
- [ ] Add dismiss button "Отмена" with Lucide `X` icon or clear button styling.
- [ ] Verify accessibility attributes (`role="dialog"`, `aria-modal="true"`).

### Task 2: Integrate Source Modal and Dual Inputs into MobileFileUploader

**Files:**
- Modify: `src/components/mobile/MobileFileUploader.tsx`

- [ ] Add internal state `isSourceModalOpen` to control modal visibility.
- [ ] Maintain `mediaInputRef` (`accept="image/*,video/*"`) alongside existing `fileInputRef`.
- [ ] Connect main upload button click to open the source modal when not currently uploading.
- [ ] Render `MobileUploadSourceModal` and wire handlers (`onSelectMedia` -> `mediaInputRef.current?.click()`, `onSelectAllFiles` -> `fileInputRef.current?.click()`).
- [ ] Ensure both inputs use the passed `onFileUpload` handler and `multiple` attribute.

### Task 3: Refine File Input Reset in useMobileState and Verify Build

**Files:**
- Modify: `src/hooks/useMobileState.ts`

- [ ] In `handleFileUpload`, safely capture files and reset `e.target.value = ''` so selecting the same file sequentially re-triggers the change event.
- [ ] Run `npm run lint` (`oxlint`) to ensure zero linting errors.
- [ ] Run `npm run build` (`tsc -b && vite build`) to verify complete TypeScript type safety and bundling.
