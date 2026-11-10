# Mobile Upload Source Selection Specification

## Problem Statement
On Android mobile browsers (Chrome, Samsung Internet, Firefox), a generic file input without an accept attribute (`<input type="file" multiple />`) defaults to the Android document/system file picker ("Files" / "Recent documents"). This prevents the native Android Photo Picker / Gallery interface from appearing, requiring users to navigate complex filesystem folders to locate photos and videos. On iOS, the browser natively prompts between Photo Library and Files, creating an inconsistent and suboptimal experience for Android users.

## Proposed Solution
Introduce a mobile source selection modal (`MobileUploadSourceModal`) that triggers when clicking the file upload prompt. The modal allows the user to choose between:
1. "Галерея (Фото и видео)": Triggers an `<input type="file" multiple accept="image/*,video/*" />`, which on Android invokes the visual Android Photo Picker (Google Photos / Samsung Gallery) and on iOS opens the Photo Library.
2. "Все файлы и документы": Triggers an `<input type="file" multiple />`, which opens the system document / file manager.

## Component Architecture
- `src/components/mobile/MobileUploadSourceModal.tsx`: Dedicated modal/bottom sheet component following SRP and UI component size constraints (<200 lines). Renders clean backdrop, touch-friendly selection cards with Lucide icons (`Image`, `FolderOpen`), descriptions, and dismiss action.
- `src/components/mobile/MobileFileUploader.tsx`: Houses both hidden `<input>` elements (media and generic files) and controls the open/close state of `MobileUploadSourceModal`.
- `src/hooks/useMobileState.ts`: Minor cleanup on `handleFileUpload` to reset the event target value (`e.target.value = ''`), allowing sequential re-selection of the same file.

## UX Flow
1. User taps "Выбрать из Фотопленки или Файлов" on mobile.
2. Bottom sheet modal slides up with backdrop overlay.
3. User selects "Галерея (Фото и видео)" -> Media file picker opens directly.
   Or user selects "Все файлы и документы" -> Generic document picker opens.
   Or user taps backdrop / "Отмена" -> Modal closes with no action.
4. On file selection, existing upload pipeline (`/api/upload` with progress bar) runs as before.
