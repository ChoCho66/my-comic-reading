// Fetches the static HTML layout and injects it into the page.
// Doing this keeps `index.html` tiny and lets us edit the layout in one place.
async function loadLayout() {
  const res = await fetch("/assets/layout.html");
  const html = await res.text();
  const root = document.getElementById("app-root");
  if (root) {
    root.innerHTML = html;
  } else {
    // Fallback: if #app-root is missing, append to <body> so the page still works.
    document.body.insertAdjacentHTML("beforeend", html);
  }
}

// Boot sequence: load the layout first, then pull in the main app module.
async function boot() {
  await loadLayout();
  await import("/assets/app.js");
}

boot().catch((err) => {
  console.error("Failed to load layout or app", err);
});
