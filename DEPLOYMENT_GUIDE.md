# 🚀 Production Deployment & Security Guide for Ubuntu Server

This guide details step-by-step instructions for deploying the **Agentic AI Day 2026** web application on an Ubuntu server, specifically engineered to handle **6,000+ simultaneous users on university Wi-Fi**.

---

## 📌 Prerequisites & Architecture Overview

- **Server OS**: Ubuntu 20.04 / 22.04 / 24.04 LTS
- **Backend Stack**: Node.js 20+ LTS, Express, Mongoose / MongoDB 6+
- **Frontend Stack**: React 18, Vite (Static Production Bundle served by Nginx)
- **Process Manager**: PM2 (Cluster Mode across multi-core CPU)
- **Reverse Proxy**: Nginx with Gzip compression and SSL (Certbot)
- **Network Environment**: College Wi-Fi NAT (6,000 users sharing public IP address)

---

## ⚡ Quick Deployment (Automated Script)

If you have fresh Ubuntu server access, simply transfer the codebase and run:

```bash
cd /path/to/Ai_day
chmod +x deployment/deploy-ubuntu.sh
./deployment/deploy-ubuntu.sh
```

---

## 🛠️ Step-by-Step Manual Deployment Guide

### Step 1: Install System Dependencies on Ubuntu

Connect to your Ubuntu server via SSH:

```bash
ssh user@your-server-ip
```

Update system packages and install Node.js 20 LTS, Nginx, and MongoDB:

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx mongodb-org pm2 certbot python3-certbot-nginx

# Start & Enable MongoDB
sudo systemctl enable mongod
sudo systemctl start mongod
```

---

### Step 2: Clone / Transfer Workspace & Configure Environment

Create application directory:

```bash
sudo mkdir -p /var/www/agentic-ai-day
sudo chown -R $USER:$USER /var/www/agentic-ai-day
cd /var/www/agentic-ai-day
```

Copy your project files into `/var/www/agentic-ai-day`.

#### Configure Production Environment Variables:

```bash
cd /var/www/agentic-ai-day/backend
cp .env.production.example .env
nano .env
```

Set your production credentials in `.env`:
```env
NODE_ENV=production
PORT=6007
BASE_API=/cseAI
MONGODB_URI=mongodb://127.0.0.1:27017/agentic_ai_day
ADMIN_USERNAME=cseadmin
ADMIN_PASSWORD=YourStrongSecretPassword2026!
CORS_ORIGIN=https://yourdomain.com
```

---

### Step 3: Install Dependencies & Build Frontend Bundle

#### 1. Backend:
```bash
cd /var/www/agentic-ai-day/backend
npm install --production
```

#### 2. Frontend:
```bash
cd /var/www/agentic-ai-day/frontend
npm install
npm run build
```
*(This outputs optimized production assets to `/var/www/agentic-ai-day/frontend/dist`)*

---

### Step 4: Launch Backend with PM2 Cluster Mode

PM2 automatically runs Node in cluster mode, spawning worker processes across all available CPU cores on your Ubuntu server:

```bash
cd /var/www/agentic-ai-day/backend
pm2 start ecosystem.config.cjs
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER
```

#### PM2 Useful Commands:
- View live cluster status: `pm2 status`
- Monitor CPU/Memory: `pm2 monit`
- View live application logs: `pm2 logs`
- Zero-downtime reload: `pm2 reload agentic-ai-backend`

---

### Step 5: Configure Nginx & Security Firewall

Copy the Nginx configuration file:

```bash
sudo cp /var/www/agentic-ai-day/deployment/nginx.conf /etc/nginx/sites-available/agentic-ai-day
sudo ln -sf /etc/nginx/sites-available/agentic-ai-day /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

Test and restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

Enable UFW Firewall (Allow SSH, HTTP, HTTPS):
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

### Step 6: Enable Free SSL/TLS (HTTPS) with Let's Encrypt Certbot

To secure traffic with `https://`:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot automatically configures Nginx SSL parameters and sets up auto-renewal cron jobs!

---

## 🔒 Security & NAT Rate Limiter Verification

### 1. Campus Wi-Fi NAT Rate Limiting Strategy
- The application uses `app.set('trust proxy', 1)` to accurately read `X-Forwarded-For` from Nginx.
- Authentication (`/login`, `/enroll-event`) & Registration (`/register`, `/team-register`) rate limits are **keyed by User Email / RegNo** instead of raw IP.
- This prevents 6,000 students on the same campus IP from locking each other out.

### 2. Microsecond Duplicate Registration Prevention
- MongoDB schemas enforce unique indexes on `email`, `regNo`, and `aiId`.
- Consecutive double-clicks on "Register" are blocked at the database layer with zero duplicate entries.

---

## 🔍 Verification & Troubleshooting

- **Check Backend API**: `curl http://localhost:6007/`
- **Check MongoDB Status**: `sudo systemctl status mongod`
- **Check Nginx Access/Error Logs**:
  - `sudo tail -f /var/log/nginx/access.log`
  - `sudo tail -f /var/log/nginx/error.log`
- **Check Application Logs**: `pm2 logs`
