use anyhow::{Context, Result, bail};
use std::{
    fs,
    path::{Path, PathBuf},
};

pub fn validate_directory(path: PathBuf) -> Result<PathBuf> {
    let metadata =
        fs::metadata(&path).with_context(|| format!("could not read {}", path.display()))?;
    if !metadata.is_dir() {
        bail!("{} is not a directory", path.display());
    }
    Ok(path)
}

pub fn load_images(dir: &Path) -> Result<Vec<String>> {
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

pub fn content_type_for(name: &str) -> &'static str {
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
