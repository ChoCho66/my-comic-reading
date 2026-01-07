// File helpers for validating folders and reading image names.
use anyhow::{Context, Result, bail};
use std::{
    fs,
    path::{Path, PathBuf},
};

pub fn validate_directory(path: PathBuf) -> Result<PathBuf> {
    // Make sure the provided path exists and is a directory.
    let metadata =
        fs::metadata(&path).with_context(|| format!("could not read {}", path.display()))?;
    if !metadata.is_dir() {
        bail!("{} is not a directory", path.display());
    }
    Ok(path)
}

pub fn load_images(dir: &Path) -> Result<Vec<String>> {
    // Read filenames that look like images inside the directory.
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

    files.sort(); // Keep names in stable order (001.png, 002.png, ...)
    Ok(files)
}

pub fn content_type_for(name: &str) -> &'static str {
    // Basic MIME type lookup so the browser displays images correctly.
    match Path::new(name)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        _ => "application/octet-stream",
    }
}

fn is_image(path: &Path) -> bool {
    match path.extension().and_then(|ext| ext.to_str()) {
        Some(ext) => matches!(ext.to_ascii_lowercase().as_str(), "png" | "jpg" | "jpeg" | "webp"),
        None => false,
    }
}
