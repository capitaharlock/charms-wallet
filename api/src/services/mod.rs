// api/src/services/mod.rs

pub mod external;
pub mod local;

pub use external::ExternalWalletService;
pub use local::LocalWalletService;
