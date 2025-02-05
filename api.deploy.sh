#!/bin/bash

# Navigate to the API directory
cd /home/dockers/bitcoinos/charms-wallet/api

# Build the Rust project
echo "Building the Rust API..."
cargo build --release

# Check if the build was successful
if [ $? -ne 0 ]; then
    echo "Build failed, exiting..."
    exit 1
fi

# Start the API using PM2
echo "Starting the Rust API with PM2..."
pm2 start ./target/release/api -f --name "charms-api"

# Save the PM2 process list
pm2 save

echo "Rust API deployment complete."
