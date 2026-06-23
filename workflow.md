# Workflow

This project runs as a local Rust/Axum HTTP server and opens a browser-based comic reader UI. The normal command is:

```sh
cargo run -- --dir /path/to/comics --port 4000 --browser default
```

`--dir` is optional. If it is omitted, the browser UI can load images through the folder picker or drag/drop. Supported image extensions are `.png`, `.jpg`, `.jpeg`, and `.webp`.

## 1. Rust Startup

- Step 1.1 - `src/main.rs` parses CLI flags with Clap: optional `--dir`, `--port`, and `--browser`.
- Step 1.2 - `src/main.rs` validates the initial directory, loads image names, and rejects an explicitly supplied empty image folder.
- Step 1.3 - `src/main.rs` creates shared `AppState` and builds the Axum router.
- Step 1.4 - `src/main.rs` binds a localhost TCP listener and builds the base URL.
- Step 1.5 - `src/main.rs` launches the requested browser in a background task.
- Step 1.6 - `src/main.rs` starts the Axum server and attaches graceful shutdown.
- Step 1.7 - `src/main.rs` waits for Ctrl+C and lets the server exit cleanly.

## 2. File Discovery

- Step 2.1 - `src/files.rs` validates that a supplied path exists and is a directory.
- Step 2.2 - `src/files.rs` scans the directory, keeps supported image files, and sorts filenames in stable lexicographic order.
- Step 2.3 - `src/files.rs` maps image filenames to HTTP `Content-Type` values before they are returned to the browser.

## 3. Browser Launch

- Step 3.1 - `src/browser.rs` moves browser launching onto a blocking thread so async server startup is not stalled.
- Step 3.2 - `src/browser.rs` opens the default browser when `--browser default` is selected.
- Step 3.3 - `src/browser.rs` opens Microsoft Edge with platform-specific commands when `--browser edge` is selected.
- Step 3.4 - `src/browser.rs` opens Brave with platform-specific commands when `--browser brave` is selected.

## 4. HTTP Layer

- Step 4.1 - `src/web.rs` stores the active directory and active image list in shared async state.
- Step 4.2 - `src/web.rs` embeds HTML, CSS, and JavaScript assets into the binary with `include_str!`.
- Step 4.3 - `src/web.rs` registers routes for the page shell, assets, APIs, and image streaming.
- Step 4.4 - `src/web.rs` serves `assets/index.html` at `/`.
- Step 4.5 - `src/web.rs` serves embedded static assets from `/assets/:name`.
- Step 4.6 - `src/web.rs` returns the active image list from `/api/images`.
- Step 4.7 - `src/web.rs` accepts `/api/select-dir`, validates the submitted path, loads images, and updates shared state.
- Step 4.8 - `src/web.rs` serves `/images/:name`, guards against path traversal, reads the file, and returns it with the right content type.
- Step 4.9 - `src/web.rs` builds reusable HTTP responses for embedded assets.

## 5. Frontend Boot

- Step 5.1 - `assets/index.html` creates the app mount point, links styles, and loads `assets/layout.js`.
- Step 5.2 - `assets/layout.js` fetches `assets/layout.html` and injects the layout into `#app-root`.
- Step 5.3 - `assets/layout.js` imports `assets/app.js` only after the layout exists in the DOM.
- Step 5.4 - `assets/dom.js` collects all DOM references used by the main app module.
- Step 5.5 - `assets/i18n.js` provides language packs and helpers used to redraw UI text.

## 6. App Initialization

- Step 6.1 - `assets/app.js` applies the active language to all visible UI labels.
- Step 6.2 - `assets/app.js` initializes gallery, slideshow, book, and status state.
- Step 6.3 - `assets/app.js` wires UI events: folder picking, drag/drop, pagination, slideshow buttons, keyboard shortcuts, book controls, and language controls.
- Step 6.4 - `assets/app.js` loads server-provided images from `/api/images` so a `--dir` launch shows images immediately.
- Step 6.5 - `assets/app.js` applies startup defaults: language text, image width, initial server images, and synced slide-mode selectors.

## 7. Gallery Rendering

- Step 7.1 - `assets/app.js` renders the current page of thumbnails and captions.
- Step 7.2 - `assets/app.js` moves between gallery pages and rebuilds the page dropdown.
- Step 7.3 - `assets/app.js` formats and refreshes status text when source, language, or counts change.
- Step 7.4 - `assets/app.js` updates the CSS image width variable from the width slider.

## 8. Local Folder Sources

- Step 8.1 - `assets/app.js` cleans up object URLs and resets slideshow metadata when switching sources or books.
- Step 8.2 - `assets/app.js` groups selected local files by top-level folder so each folder acts like a comic book.
- Step 8.3 - `assets/app.js` converts local `File` objects into image items with blob URLs.
- Step 8.4 - `assets/app.js` activates a book, loads its images, refreshes the grid, and updates controls.
- Step 8.5 - `assets/app.js` handles files received from the folder picker or drag/drop.
- Step 8.6 - `assets/app.js` walks dropped folders recursively and flattens them into files.

## 9. Slideshow

- Step 9.1 - `assets/app.js` changes slide mode and rebuilds slide windows.
- Step 9.2 - `assets/app.js` opens the modal slideshow from the selected image or current page.
- Step 9.3 - `assets/app.js` moves through slides and crosses book boundaries when needed.
- Step 9.4 - `assets/app.js` jumps to an absolute image index or a progress fraction.
- Step 9.5 - `assets/app.js` reads image dimensions and decides whether auto mode should pair pages.
- Step 9.6 - `assets/app.js` builds slide windows for auto, single, double, and triple modes.
- Step 9.7 - `assets/app.js` renders the active slide images and caption.
- Step 9.8 - `assets/app.js` closes the modal and returns to the gallery page containing the last viewed image.

## 10. Book Navigation

- Step 10.1 - `assets/app.js` enables, disables, and labels book navigation controls.
- Step 10.2 - `assets/app.js` switches to the previous or next book, wrapping around the available books.
- Step 10.3 - `assets/app.js` renders book selection buttons in both the sidebar and modal.
