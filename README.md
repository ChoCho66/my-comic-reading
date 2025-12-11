# Comic Reader (Rust)

A small Axum-based local server that lets you browse a folder of comic page images through the browser. The web UI is embedded (`assets/index.html` via `include_str!`) so no extra files are required after building.

## Prerequisites
- Rust toolchain (cargo) installed

## Build a Release Binary
```sh
cargo build --release
```
The executable is at `target/release/my-comic-reading` (CLI name prints as `comic-reader` because of Clap metadata).

## Run from the Built Binary
```sh
target/release/my-comic-reading --dir /path/to/comics --port 4000 --browser default
```
- Omit `--dir` to pick a folder in the UI.
- `--port` defaults to `4000`.
- `--browser` chooses which browser to open (`default`, `firefox`, `chrome`, `safari`).

## Install into PATH
```sh
cargo install --path . --locked
```
This places the binary at `~/.cargo/bin/my-comic-reading`; ensure that directory is on your `PATH`, then you can run:
```sh
my-comic-reading --dir /path/to/comics
```
To update later, rerun with `--force`.

## Optional: Custom Command Name
If you want a shorter command, copy or rename the built binary to a directory on your `PATH`, e.g.:
```sh
cp target/release/my-comic-reading ~/bin/comic-reader
```

## Build a Double-Clickable macOS App
- Requires macOS with Xcode command line tools installed.
- Run the bundling script:
```sh
./scripts/package_macos.sh
```
The app bundle is created at `dist/Comic Reader.app`. Double-click it in Finder (or run `open "dist/Comic Reader.app"`) to launch the server and automatically open your browser.

- Environment overrides:
  - `PROFILE` (default `release`) to pick a cargo profile.
  - `APP_VERSION` and `BUNDLE_ID` to control the Info.plist metadata.
