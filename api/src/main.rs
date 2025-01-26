// api/src/main.rs
mod error;
mod models;
mod handlers;
mod services;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{CorsLayer, Any};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(handlers::health_check))
        .route("/wallet/create", post(handlers::create_wallet))
        .route("/wallet/balance/{address}", get(handlers::get_balance))
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 9123));
    tracing::info!("Listening on {}", addr);
    axum::serve(tokio::net::TcpListener::bind(&addr).await.unwrap(), app).await.unwrap();
}