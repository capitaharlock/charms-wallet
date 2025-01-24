#!/bin/bash

# Navigate to the webapp directory
cd /home/dockers/bitcoinos/charms-wallet/webapp || { echo "Failed to navigate to webapp directory"; exit 1; }

# Pull the latest changes from Git
echo "Pulling latest changes from Git..."
git pull || { echo "Git pull failed"; exit 1; }

# Install dependencies
echo "Installing dependencies..."
npm install || { echo "Failed to install dependencies"; exit 1; }

# Build the webapp
echo "Building the webapp..."
npm run build || { echo "Build failed"; exit 1; }

# Restart Nginx
echo "Restarting Nginx..."
sudo systemctl restart nginx || { echo "Failed to restart Nginx"; exit 1; }

echo "Webapp deployment complete!"
