async function loadLayout() {
  // Step 5.2: Fetch the static layout HTML before the main app runs.
  const res = await fetch("/assets/layout.html");
  const html = await res.text();
  const root = document.getElementById("app-root");
  if (root) {
    // Step 5.2: Inject the layout into the app mount point.
    root.innerHTML = html;
  } else {
    // Fallback: if #app-root is missing, append to <body> so the page still works.
    document.body.insertAdjacentHTML("beforeend", html);
  }
}

async function boot() {
  await loadLayout();
  // Step 5.3: Import the main app module after the layout exists.
  await import("/assets/app.js");
}

boot().catch((err) => {
  console.error("Failed to load layout or app", err);
});
