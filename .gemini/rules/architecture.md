# Modular Architecture Rule

## Core Directive: No Monolithic Files
- All features must be structured into modular, single-responsibility components and modules.
- Do not dump UI markup, business logic, API calls, and styling into a single file.
- React components must stay below 200–300 lines. Split complex screens into `components/<feature>/`, `hooks/`, `services/`, and `utils/`.
- Rust modules must separate state, network routes, clipboard polling, and persistence.
- In-memory data collections must have strict upper bounds (e.g., max 100 entries).
- Rapid polling loops must reuse OS resources and check OS sequence numbers (`GetClipboardSequenceNumber`) to avoid decoding bitmaps repeatedly.
- File downloads and previews must stream chunks (`ServeFile`) with HTTP Range support; never read entire multi-gigabyte files into RAM.
- Endpoints must enforce path confinement inside the download directory and validate filenames against path traversal and DOS reserved device names.

## Repository Cleanliness & Documentation
- Never commit batch scripts (`.bat`, `.cmd`), shell scripts (`.sh`, `.ps1`), or temporary scratch files to the repository.
- Keep `README.md` strictly technical, formal, and 100% free of emojis.

