use axum::{
    Json, Router,
    body::Body,
    extract::{Path as AxumPath, State},
    http::{StatusCode, header},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
};
use serde::Serialize;
use std::{fs, path::PathBuf, sync::Arc};

use crate::files::{content_type_for, load_images, validate_directory};

#[derive(Clone)]
pub struct AppState {
    pub dir: Arc<tokio::sync::Mutex<Option<PathBuf>>>,
    pub images: Arc<tokio::sync::Mutex<Vec<String>>>,
}

impl AppState {
    pub fn new(initial_dir: Option<PathBuf>, initial_images: Vec<String>) -> Self {
        Self {
            dir: Arc::new(tokio::sync::Mutex::new(initial_dir)),
            images: Arc::new(tokio::sync::Mutex::new(initial_images)),
        }
    }
}

#[derive(Serialize)]
struct ImagesResponse {
    images: Vec<String>,
    page_size: usize,
}

#[derive(serde::Deserialize)]
struct SelectDirRequest {
    path: String,
}

#[derive(Serialize)]
struct SelectDirResponse {
    ok: bool,
    count: usize,
    message: String,
}

const PAGE_SIZE: usize = 20;
const INDEX_HTML: &str = include_str!("../assets/index.html");

pub fn app_router(state: AppState) -> Router {
    Router::new()
        .route("/", get(index))
        .route("/api/images", get(api_images))
        .route("/api/select-dir", post(select_dir))
        .route("/images/:name", get(get_image))
        .with_state(state)
}

async fn index() -> impl IntoResponse {
    Html(INDEX_HTML)
}

async fn api_images(State(state): State<AppState>) -> impl IntoResponse {
    let images = state.images.lock().await.clone();
    Json(ImagesResponse {
        images,
        page_size: PAGE_SIZE,
    })
}

async fn select_dir(
    State(state): State<AppState>,
    Json(payload): Json<SelectDirRequest>,
) -> impl IntoResponse {
    let trimmed = payload.path.trim();
    if trimmed.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(SelectDirResponse {
                ok: false,
                count: 0,
                message: "請輸入資料夾路徑".into(),
            }),
        );
    }

    let path = PathBuf::from(trimmed);
    let dir = match validate_directory(path.clone()) {
        Ok(dir) => dir,
        Err(err) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(SelectDirResponse {
                    ok: false,
                    count: 0,
                    message: format!("{err}"),
                }),
            );
        }
    };

    let images = match load_images(&dir) {
        Ok(imgs) => imgs,
        Err(err) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(SelectDirResponse {
                    ok: false,
                    count: 0,
                    message: format!("{err}"),
                }),
            );
        }
    };

    {
        let mut dir_lock = state.dir.lock().await;
        *dir_lock = Some(dir);
        let mut imgs_lock = state.images.lock().await;
        *imgs_lock = images.clone();
    }

    (
        StatusCode::OK,
        Json(SelectDirResponse {
            ok: true,
            count: images.len(),
            message: "載入完成".into(),
        }),
    )
}

async fn get_image(State(state): State<AppState>, AxumPath(name): AxumPath<String>) -> Response {
    if name.contains("..") || name.contains('/') || name.contains('\\') {
        return StatusCode::BAD_REQUEST.into_response();
    }

    let dir_opt = state.dir.lock().await.clone();
    let Some(dir) = dir_opt else {
        return StatusCode::NOT_FOUND.into_response();
    };

    let path = dir.join(&name);
    match fs::metadata(&path) {
        Ok(meta) => {
            if !meta.is_file() {
                return StatusCode::NOT_FOUND.into_response();
            }
        }
        Err(_) => return StatusCode::NOT_FOUND.into_response(),
    }

    match tokio::fs::read(&path).await {
        Ok(bytes) => {
            let mime = content_type_for(&name);
            let mut res = Response::new(Body::from(bytes));
            res.headers_mut()
                .insert(header::CONTENT_TYPE, header::HeaderValue::from_static(mime));
            res
        }
        Err(_) => StatusCode::NOT_FOUND.into_response(),
    }
}
