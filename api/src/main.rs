// api/src/main.rs
mod error;
mod handlers;
mod models;
mod services;

use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

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
        .route("/wallet/broadcast", post(handlers::broadcast_transaction))
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 9123));
    tracing::info!("Listening on {}", addr);
    axum::serve(tokio::net::TcpListener::bind(&addr).await.unwrap(), app)
        .await
        .unwrap();
}
