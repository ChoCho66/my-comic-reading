# Assets Layout

- `index.html`: Minimal shell that mounts `#app-root`, links the stylesheet, and loads `layout.js`.
- `layout.html`: The full page markup (sidebar, content area, modals) injected into `#app-root` by `layout.js`.
- `styles.css`: All UI styling and variables for the Comic Reader.
- `layout.js`: Loads `layout.html` into the page, then dynamically imports `app.js` to start the app.
- `app.js`: Main client logic (state, events, rendering) written as an ES module.
- `dom.js`: Collects and exports DOM element references used by `app.js`.
- `i18n.js`: Language packs and helpers for translating UI text.
