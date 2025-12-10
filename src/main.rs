use anyhow::{Context, Result, bail};
use axum::{
    Json, Router,
    extract::State,
    response::{Html, IntoResponse},
    routing::get,
};
use clap::{Parser, ValueEnum};
use serde::Serialize;
use std::{
    fs,
    io::{self, Write},
    net::SocketAddr,
    path::{Path, PathBuf},
    process::Command,
    sync::Arc,
};
use tokio::signal;
use tower_http::services::ServeDir;
use webbrowser::Browser;

#[derive(Parser, Debug)]
#[command(name = "comic-reader", version)]
struct Args {
    /// Path to the folder that holds comic images (e.g., 001.png, 002.png, ...).
    #[arg(short, long)]
    dir: Option<PathBuf>,

    /// HTTP port to listen on.
    #[arg(long, default_value_t = 4000)]
    port: u16,

    /// Browser to launch when the server starts.
    #[arg(long, value_enum, default_value_t = BrowserChoice::Default)]
    browser: BrowserChoice,
}

#[derive(Copy, Clone, Debug, Eq, PartialEq, ValueEnum)]
enum BrowserChoice {
    Default,
    Edge,
    Brave,
}

#[derive(Clone)]
struct AppState {
    images: Arc<Vec<String>>,
}

#[derive(Serialize)]
struct ImagesResponse {
    images: Vec<String>,
    page_size: usize,
}

const PAGE_SIZE: usize = 20;

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    let image_dir = resolve_directory(args.dir)?;
    let images = load_images(&image_dir)?;

    if images.is_empty() {
        bail!(
            "No images found in {} (looking for .png, .jpg, .jpeg)",
            image_dir.display()
        );
    }

    let state = AppState {
        images: Arc::new(images),
    };

    let app = Router::new()
        .route("/", get(index))
        .route("/api/images", get(api_images))
        .nest_service("/images", ServeDir::new(image_dir))
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], args.port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .context("failed to bind to port")?;
    let url = format!("http://{}", listener.local_addr()?);

    // Launch the browser without blocking server startup.
    let browser_choice = args.browser;
    let browser_url = url.clone();
    tokio::spawn(async move {
        if let Err(err) = launch_browser(browser_choice, &browser_url).await {
            eprintln!("Browser launch failed: {err:?}");
        }
    });

    println!("Serving comics at {url}");
    println!("Press Ctrl+C to stop the server.");

    let server = axum::serve(listener, app).with_graceful_shutdown(shutdown_signal());
    server.await.context("server error")?;
    Ok(())
}

async fn shutdown_signal() {
    let _ = signal::ctrl_c().await;
    println!("\nShutting down...");
}

fn resolve_directory(dir: Option<PathBuf>) -> Result<PathBuf> {
    if let Some(path) = dir {
        return validate_directory(path);
    }

    print!("Enter the path to the image folder: ");
    io::stdout().flush().ok();

    let mut input = String::new();
    io::stdin()
        .read_line(&mut input)
        .context("failed to read directory path")?;
    let trimmed = input.trim();
    if trimmed.is_empty() {
        bail!("No directory provided.");
    }

    validate_directory(PathBuf::from(trimmed))
}

fn validate_directory(path: PathBuf) -> Result<PathBuf> {
    let metadata =
        fs::metadata(&path).with_context(|| format!("could not read {}", path.display()))?;
    if !metadata.is_dir() {
        bail!("{} is not a directory", path.display());
    }
    Ok(path)
}

fn load_images(dir: &Path) -> Result<Vec<String>> {
    let mut files = Vec::new();
    for entry in fs::read_dir(dir).with_context(|| format!("failed to read {}", dir.display()))? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() && is_image(&path) {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                files.push(name.to_string());
            }
        }
    }

    files.sort();
    Ok(files)
}

fn is_image(path: &Path) -> bool {
    match path.extension().and_then(|ext| ext.to_str()) {
        Some(ext) => matches!(ext.to_ascii_lowercase().as_str(), "png" | "jpg" | "jpeg"),
        None => false,
    }
}

async fn launch_browser(choice: BrowserChoice, url: &str) -> Result<()> {
    let url = url.to_string();
    tokio::task::spawn_blocking(move || -> Result<()> {
        match choice {
            BrowserChoice::Default => {
                webbrowser::open(&url).context("open default browser failed")?;
            }
            BrowserChoice::Edge => open_edge(&url)?,
            BrowserChoice::Brave => open_brave(&url)?,
        }
        Ok(())
    })
    .await
    .context("browser task join error")??;
    Ok(())
}

fn open_edge(url: &str) -> Result<()> {
    if cfg!(target_os = "macos") {
        Command::new("open")
            .args(["-a", "Microsoft Edge", url])
            .status()
            .context("failed to launch Microsoft Edge with open")?;
        return Ok(());
    }

    if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "start", &format!("microsoft-edge:{url}")])
            .status()
            .context("failed to launch Edge on Windows")?;
        return Ok(());
    }

    // Linux or other platforms: try common binary name and fall back to default browser.
    let status = Command::new("microsoft-edge")
        .arg(url)
        .status()
        .context("failed to execute microsoft-edge binary")?;
    if !status.success() {
        webbrowser::open_browser(Browser::Default, url)
            .context("fallback to default browser after Edge failure")?;
    }
    Ok(())
}

fn open_brave(url: &str) -> Result<()> {
    if cfg!(target_os = "macos") {
        Command::new("open")
            .args(["-a", "Brave Browser", url])
            .status()
            .context("failed to launch Brave with open")?;
        return Ok(());
    }

    if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "start", url])
            .status()
            .context("failed to launch Brave on Windows")?;
        return Ok(());
    }

    let status = Command::new("brave-browser")
        .arg(url)
        .status()
        .context("failed to execute brave-browser")?;
    if !status.success() {
        webbrowser::open_browser(Browser::Default, url)
            .context("fallback to default browser after Brave failure")?;
    }
    Ok(())
}

async fn index() -> impl IntoResponse {
    Html(INDEX_HTML)
}

async fn api_images(State(state): State<AppState>) -> impl IntoResponse {
    Json(ImagesResponse {
        images: (*state.images).clone(),
        page_size: PAGE_SIZE,
    })
}

const INDEX_HTML: &str = r#"<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comic Reader</title>
  <style>
    :root {
      --bg: linear-gradient(135deg, #0f172a, #1f2937);
      --panel: rgba(255, 255, 255, 0.08);
      --accent: #f97316;
      --text: #e5e7eb;
      --muted: #94a3b8;
      --shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "Fira Sans", "Helvetica Neue", sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      position: sticky;
      top: 0;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(8px);
      box-shadow: var(--shadow);
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .controls {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    button {
      background: var(--panel);
      color: var(--text);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 10px 14px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-weight: 600;
      letter-spacing: 0.2px;
    }
    button:hover { border-color: rgba(249, 115, 22, 0.6); transform: translateY(-1px); }
    button.primary { background: var(--accent); color: #111827; border: none; }
    main { padding: 18px; width: 100%; max-width: 1040px; margin: 0 auto; flex: 1; }
    .status { color: var(--muted); margin: 12px 0 18px; }
    .grid {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .card {
      background: var(--panel);
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      padding: 10px;
    }
    .thumb {
      width: 100%;
      height: auto;
      max-height: none;
      object-fit: contain;
      background: #0b1222;
      cursor: pointer;
    }
    .caption {
      padding: 8px 4px 0;
      font-size: 14px;
      color: var(--muted);
    }
    .pager {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      margin-top: 18px;
      flex-wrap: wrap;
    }
    .pager span { color: var(--muted); font-weight: 600; }
    /* Modal */
    .modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 0;
      z-index: 10;
    }
    .modal.active { display: flex; }
    .modal-content {
      background: rgba(0, 0, 0, 0.9);
      border: none;
      border-radius: 0;
      padding: 12px;
      width: 100vw;
      height: 100vh;
      max-width: 100vw;
      max-height: 100vh;
      box-shadow: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .modal img {
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      object-fit: contain;
      border-radius: 6px;
      background: #0f172a;
      flex: 1;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--muted);
      font-weight: 600;
    }
    .empty {
      text-align: center;
      color: var(--muted);
      margin-top: 50px;
    }
    @media (max-width: 640px) {
      header { flex-direction: column; align-items: flex-start; }
      .thumb { height: 200px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="title">Comic Reader</div>
    <div class="controls">
      <button class="primary" id="startSlide">投影片模式</button>
      <button id="showAll">全部瀏覽</button>
    </div>
  </header>
  <main>
    <div class="status" id="status">Loading images...</div>
    <div class="grid" id="grid"></div>
    <div class="pager" id="pager">
      <button id="prevPage">上一頁</button>
      <span id="pageInfo"></span>
      <button id="nextPage">下一頁</button>
    </div>
    <div class="empty" id="empty" style="display:none;">No images found.</div>
  </main>

  <div class="modal" id="modal">
    <div class="modal-content">
      <div class="modal-header">
        <div id="modalCaption"></div>
        <div>
          <button id="prevSlide">上一張</button>
          <button id="nextSlide">下一張</button>
          <button id="closeModal">關閉</button>
        </div>
      </div>
      <img id="modalImage" alt="Slide" />
    </div>
  </div>

  <script>
    const gridEl = document.getElementById("grid");
    const pagerEl = document.getElementById("pager");
    const pageInfoEl = document.getElementById("pageInfo");
    const statusEl = document.getElementById("status");
    const emptyEl = document.getElementById("empty");
    const modalEl = document.getElementById("modal");
    const modalImage = document.getElementById("modalImage");
    const modalCaption = document.getElementById("modalCaption");
    const PAGE_SIZE = 20;
    let images = [];
    let currentPage = 1;
    let slideIndex = 0;

    document.getElementById("prevPage").addEventListener("click", () => changePage(-1));
    document.getElementById("nextPage").addEventListener("click", () => changePage(1));
    document.getElementById("startSlide").addEventListener("click", () => startSlideshow(currentPageStartIndex()));
    document.getElementById("showAll").addEventListener("click", () => renderPage(currentPage));
    document.getElementById("prevSlide").addEventListener("click", () => moveSlide(-1));
    document.getElementById("nextSlide").addEventListener("click", () => moveSlide(1));
    document.getElementById("closeModal").addEventListener("click", closeModal);
    modalEl.addEventListener("click", (e) => { if (e.target === modalEl) closeModal(); });
    document.addEventListener("keydown", (e) => {
      if (modalEl.classList.contains("active")) {
        if (e.key === "ArrowRight") moveSlide(1);
        if (e.key === "ArrowLeft") moveSlide(-1);
        if (e.key === "Escape") closeModal();
      }
    });

    async function loadImages() {
      try {
        const res = await fetch("/api/images");
        const data = await res.json();
        images = data.images || [];
        if (!images.length) {
          statusEl.textContent = "";
          emptyEl.style.display = "block";
          pagerEl.style.display = "none";
          return;
        }
        statusEl.textContent = `共 ${images.length} 張，分頁顯示，每頁 ${PAGE_SIZE} 張`;
        renderPage(1);
      } catch (err) {
        statusEl.textContent = "Failed to load images.";
        console.error(err);
      }
    }

    function renderPage(page = 1) {
      currentPage = page;
      const start = (page - 1) * PAGE_SIZE;
      const slice = images.slice(start, start + PAGE_SIZE);

      gridEl.innerHTML = "";
      slice.forEach((name, idx) => {
        const card = document.createElement("div");
        card.className = "card";

        const img = document.createElement("img");
        img.className = "thumb";
        img.src = `/images/${name}`;
        img.alt = name;
        img.loading = "lazy";
        img.addEventListener("click", () => startSlideshow(start + idx));

        const cap = document.createElement("div");
        cap.className = "caption";
        cap.textContent = name;

        card.appendChild(img);
        card.appendChild(cap);
        gridEl.appendChild(card);
      });

      const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
      pageInfoEl.textContent = `第 ${page} / ${totalPages} 頁`;
      document.getElementById("prevPage").disabled = page <= 1;
      document.getElementById("nextPage").disabled = page >= totalPages;
    }

    function changePage(delta) {
      const next = currentPage + delta;
      const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
      if (next < 1 || next > totalPages) return;
      renderPage(next);
    }

    function currentPageStartIndex() {
      return (currentPage - 1) * PAGE_SIZE;
    }

    function startSlideshow(index) {
      if (!images.length) return;
      slideIndex = index;
      updateSlide();
      modalEl.classList.add("active");
    }

    function moveSlide(delta) {
      if (!images.length) return;
      slideIndex = (slideIndex + delta + images.length) % images.length;
      updateSlide();
    }

    function updateSlide() {
      const name = images[slideIndex];
      modalImage.src = `/images/${name}`;
      modalCaption.textContent = `${slideIndex + 1} / ${images.length} - ${name}`;
    }

    function closeModal() {
      modalEl.classList.remove("active");
    }

    loadImages();
  </script>
</body>
</html>
"#;
