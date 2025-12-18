async function loadLayout() {
  const res = await fetch("/assets/layout.html");
  const html = await res.text();
  const root = document.getElementById("app-root");
  if (root) {
    root.innerHTML = html;
  } else {
    document.body.insertAdjacentHTML("beforeend", html);
  }
}

async function boot() {
  await loadLayout();
  await import("/assets/app.js");
}

boot().catch((err) => {
  console.error("Failed to load layout or app", err);
});
