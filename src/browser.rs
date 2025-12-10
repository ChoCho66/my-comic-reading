use anyhow::{Context, Result};
use clap::ValueEnum;
use std::process::Command;
use webbrowser::Browser;

#[derive(Copy, Clone, Debug, Eq, PartialEq, ValueEnum)]
pub enum BrowserChoice {
    Default,
    Edge,
    Brave,
}

pub async fn launch_browser(choice: BrowserChoice, url: &str) -> Result<()> {
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
