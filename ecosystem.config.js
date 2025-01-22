module.exports = {
  apps: [{
    name: "charms-wallet-api",
    script: "./api/target/release/btc-wallet-api",
    instances: 1,
    env: {
      PORT: 9123
    }
  }]
}
