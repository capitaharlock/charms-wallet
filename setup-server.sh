#!/bin/bash
set -e

PROJECT_DIR=/home/dockers/bitcoinos/charms-wallet

# Clone or pull latest
if [ ! -d "$PROJECT_DIR" ]; then
    git clone git@github.com:capitaharlock/charms-wallet.git $PROJECT_DIR
else
    cd $PROJECT_DIR
    git fetch origin
    git reset --hard origin/main
fi

# Create directories
sudo mkdir -p /var/www/charms-wallet/webapp
sudo chown -R $USER:$USER /var/www/charms-wallet

# Build API
cd $PROJECT_DIR/api
cargo build --release

# Build webapp
cd $PROJECT_DIR/webapp
npm install
npm run build

# Setup nginx and PM2
sudo ln -sf $PROJECT_DIR/nginx/*.conf /etc/nginx/sites-available/
cd /etc/nginx/sites-enabled/
sudo ln -sf ../sites-available/api.wallet.test.charms.dev .
sudo ln -sf ../sites-available/wallet.test.charms.dev .

# Deploy webapp and start API
sudo cp -r $PROJECT_DIR/webapp/dist/* /var/www/charms-wallet/webapp/
cd $PROJECT_DIR
pm2 delete charms-wallet-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

sudo nginx -t && sudo systemctl reload nginx
