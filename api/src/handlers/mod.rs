// api/src/handlers/mod.rs
mod local;
mod external;

pub use local::*;
pub use external::*;
pub use health::*;

mod health {
    use axum::response::IntoResponse;
    
    pub async fn health_check() -> impl IntoResponse {
        "OK"
    }
}