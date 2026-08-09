#!/bin/bash

# ====================================================================
# Agentic AI Day 2026 - Automated Ubuntu Server Deployment Script
# Supports Ubuntu 20.04 / 22.04 / 24.04 LTS
# ====================================================================

set -e

echo "🚀 Starting Agentic AI Day Production Deployment on Ubuntu..."

# 1. Update Ubuntu Package Repositories
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Core Dependencies (Node.js 20 LTS, Nginx, Git, MongoDB, PM2)
echo "🛠️ Installing Node.js LTS, Nginx, MongoDB, and PM2..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
fi

if ! command -v mongod &> /dev/null; then
    sudo apt install -y mongodb-org || sudo apt install -y mongodb
fi

sudo systemctl enable mongod
sudo systemctl start mongod

if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# 3. Create Deployment Directory
TARGET_DIR="/var/www/agentic-ai-day"
echo "📁 Setting up target directory at ${TARGET_DIR}..."
sudo mkdir -p ${TARGET_DIR}
sudo chown -R $USER:$USER ${TARGET_DIR}

# Copy workspace files to target directory
cp -r . ${TARGET_DIR}/

cd ${TARGET_DIR}

# 4. Install & Build Backend
echo "⚡ Setting up Backend dependencies..."
cd ${TARGET_DIR}/backend
npm install --production

if [ ! -f .env ]; then
    cp .env.production.example .env
    echo "⚠️ Created default .env file at backend/.env. Please update ADMIN_PASSWORD and MONGODB_URI!"
fi

# 5. Install & Build Frontend
echo "🎨 Building Frontend production bundle..."
cd ${TARGET_DIR}/frontend
npm install
npm run build

# 6. PM2 Cluster Setup for Backend
echo "🔄 Launching Backend with PM2 in Cluster Mode..."
cd ${TARGET_DIR}/backend
pm2 start ecosystem.config.cjs || pm2 reload ecosystem.config.cjs
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER || true

# 7. Configure Nginx
echo "🌐 Configuring Nginx Reverse Proxy..."
sudo cp ${TARGET_DIR}/deployment/nginx.conf /etc/nginx/sites-available/agentic-ai-day
sudo ln -sf /etc/nginx/sites-available/agentic-ai-day /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl restart nginx

# 8. Configure UFW Firewall
echo "🔥 Setting up UFW Firewall (Allow HTTP 80, HTTPS 443, SSH 22)..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "===================================================================="
echo "✅ Deployment Successful!"
echo "🤖 Backend Status: Run 'pm2 status'"
echo "🌐 Frontend Served via Nginx: http://$(hostname -I | awk '{print $1}')"
echo "===================================================================="
