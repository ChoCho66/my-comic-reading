// Binary entry point for the Comic Reader server.
use anyhow::{Context, Result, bail};
use clap::Parser;
use std::{net::SocketAddr, path::PathBuf};
use tokio::signal;

mod browser;
mod files;
mod web;

use browser::{BrowserChoice, launch_browser};
use files::{load_images, validate_directory};
use web::{AppState, app_router};

#[derive(Parser, Debug)]
#[command(name = "comic-reader", version)]
struct Args {
    /// Optional path to the folder that holds comic images (e.g., 001.png, 002.png, ...).
    /// If omitted, choose inside the web UI.
    #[arg(short, long)]
    dir: Option<PathBuf>,

    /// HTTP port to listen on.
    #[arg(long, default_value_t = 4000)]
    port: u16,

    /// Browser to launch when the server starts.
    #[arg(long, value_enum, default_value_t = BrowserChoice::Default)]
    browser: BrowserChoice,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Parse CLI flags and validate initial directory if provided.
    let args = Args::parse();
    let initial_dir = match args.dir {
        Some(dir) => Some(validate_directory(dir)?),
        None => None,
    };

    let initial_images = if let Some(dir) = initial_dir.as_ref() {
        load_images(dir)?
    } else {
        Vec::new()
    };

    if let Some(dir) = initial_dir.as_ref() {
        if initial_images.is_empty() {
            bail!(
                "No images found in {} (looking for .png, .jpg, .jpeg, .webp)",
                dir.display()
            );
        }
    }

    // Create shared app state and router.
    let state = AppState::new(initial_dir, initial_images);
    let app = app_router(state);

    // Bind to localhost and build the base URL.
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

    // Run the Axum server with Ctrl+C graceful shutdown.
    let server = axum::serve(listener, app).with_graceful_shutdown(shutdown_signal());
    server.await.context("server error")?;
    Ok(())
}

async fn shutdown_signal() {
    // Wait for Ctrl+C so the server can exit cleanly.
    let _ = signal::ctrl_c().await;
    println!("\nShutting down...");
}
