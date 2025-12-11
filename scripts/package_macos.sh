#!/usr/bin/env bash
set -euo pipefail

# Build a macOS .app bundle that can be launched by double-clicking in Finder.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="Comic Reader"
APP_BUNDLE_NAME="${APP_NAME}.app"
PROFILE="${PROFILE:-release}"
BIN_NAME="my-comic-reading"
APP_VERSION="${APP_VERSION:-0.1.0}"
BUNDLE_ID="${BUNDLE_ID:-com.local.comicreader}"
HIDE_DOCK="${HIDE_DOCK:-0}" # set to 1 to hide Dock icon (LSUIElement)

TARGET_BIN="${ROOT}/target/${PROFILE}/${BIN_NAME}"
DIST_DIR="${ROOT}/dist"
BUNDLE_DIR="${DIST_DIR}/${APP_BUNDLE_NAME}"
CONTENTS_DIR="${BUNDLE_DIR}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"
RESOURCES_DIR="${CONTENTS_DIR}/Resources"

echo "==> Building ${BIN_NAME} (${PROFILE} profile)"
cargo build --profile "${PROFILE}"

if [[ ! -x "${TARGET_BIN}" ]]; then
  echo "Binary not found at ${TARGET_BIN}"
  exit 1
fi

echo "==> Preparing bundle at ${BUNDLE_DIR}"
rm -rf "${BUNDLE_DIR}"
mkdir -p "${MACOS_DIR}" "${RESOURCES_DIR}"

echo "==> Writing Info.plist"
cat > "${CONTENTS_DIR}/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>${APP_NAME}</string>
  <key>CFBundleDisplayName</key>
  <string>${APP_NAME}</string>
  <key>CFBundleIdentifier</key>
  <string>${BUNDLE_ID}</string>
  <key>CFBundleVersion</key>
  <string>${APP_VERSION}</string>
  <key>CFBundleShortVersionString</key>
  <string>${APP_VERSION}</string>
  <key>CFBundleExecutable</key>
  <string>${BIN_NAME}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSMinimumSystemVersion</key>
  <string>10.15</string>
EOF

if [[ "${HIDE_DOCK}" == "1" ]]; then
  cat >> "${CONTENTS_DIR}/Info.plist" <<EOF
  <key>LSUIElement</key>
  <true/>
EOF
fi

cat >> "${CONTENTS_DIR}/Info.plist" <<EOF
</dict>
</plist>
EOF

echo "==> Copying binary"
cp "${TARGET_BIN}" "${MACOS_DIR}/${BIN_NAME}"
chmod +x "${MACOS_DIR}/${BIN_NAME}"

echo "==> Writing PkgInfo"
echo "APPL????" > "${CONTENTS_DIR}/PkgInfo"

echo "==> Bundle ready:"
echo "Open with: open \"${BUNDLE_DIR}\""
