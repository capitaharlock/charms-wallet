
# execute Charms API
cd 
RUST_LOG=info cargo run server \
  --ip-addr 127.0.0.1 \
  --port 3333 \
  --rpc-url http://127.0.0.1:48332 \
  --rpc-user hello \
  --rpc-password world


# Execute Wallet API
/Users/ricartjuncadella/Documents/Prj/bitcoinos/charms-wallet/api
cargo watch -x run


# Execute Wallet UI
cd /Users/ricartjuncadella/Documents/Prj/bitcoinos/charms-wallet/webapp
npm run dev
Local:   http://localhost:5173/ 