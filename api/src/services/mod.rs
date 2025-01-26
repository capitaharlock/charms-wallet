// api/src/services/mod.rs

mod external;
mod local;

pub use external::ExternalWalletService;
pub use local::LocalWalletService;
