// api/src/handlers/mod.rs
mod external;
mod local;

pub use external::{broadcast_transaction, get_balance};
pub use health::health_check;
pub use local::create_wallet;

mod health {
    use axum::response::IntoResponse;

    pub async fn health_check() -> impl IntoResponse {
        "OK"
    }
}
