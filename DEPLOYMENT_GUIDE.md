# 🚀 Server Deployment & Troubleshooting Guide (Agentic AI Day 2026)

This document explains why the deployment errors occurred and how to configure your server (Nginx, PM2, and Vite) so both the frontend and backend run seamlessly.

---

## 🔍 Root Cause Analysis

### 1. `Unexpected token '<', "<html> <h"... is not valid JSON`
* **Cause**: When submitting forms (Registration, Login, Team Registration, Poster Uploads), the React frontend calls `/cseAI/*`. In production, if Nginx or your web server is NOT configured to reverse proxy `/cseAI` requests to the Node/Express backend (`http://127.0.0.1:6007`), the web server attempts to handle `/cseAI/*` as a static file route. 
* Because Single Page Apps (SPAs) fall back to `index.html` for unknown routes, the web server returns the `index.html` page (which starts with `<html>...`). When JavaScript calls `response.json()`, parsing HTML as JSON throws this exact syntax error.

### 2. Broken Category Images (`Technical`, `Industry & Innovation`, `Creative`)
* **Cause**: Category and event images in the code were referenced with root relative paths (e.g., `/images/Technical.avif`). When deployed under a subpath like `/aiday/` (or with Vite `base: '/aiday/'`), `<img src="/images/Technical.avif">` asks the browser for `http://your-domain.com/images/...` instead of `http://your-domain.com/aiday/images/...`, resulting in 404 Not Found errors.

---

## ✅ Code Fixes Applied in Workspace

1. **`src/config/api.js`**:
   - Implemented `apiFetch()`, a robust API wrapper that handles non-JSON / HTML responses gracefully.
   - Implemented `getAssetUrl()`, which automatically formats asset image paths with Vite's `BASE_URL` (`/aiday/` or `/`).
   - Implemented `getUploadUrl()`, which resolves uploaded poster/paper URLs.
   - Added support for environment variable `VITE_API_BASE_URL`.

2. **Components Updated**:
   - `RegistrationForm.jsx`, `LoginPortal.jsx`, `TeamRegistrationForm.jsx`, `SubmissionModal.jsx`, `AdminDashboard.jsx`, `App.jsx`, `EventsGrid.jsx`, `EventDetailsView.jsx`, `AiPledge.jsx`, `UserProfile.jsx`.

---

## ⚙️ Server Setup Guide (Nginx & PM2)

### Step 1: Start Backend using PM2
On your production Ubuntu / Linux server, navigate to the backend folder and start the server using PM2:
```bash
cd /path/to/Ai_day/backend
npm install
pm2 start ecosystem.config.cjs --env production
pm2 save
```
Verify the backend is running and listening on port 6007:
```bash
curl http://127.0.0.1:6007/cseAI/stats
```

---

### Step 2: Configure Nginx Reverse Proxy & Static Files

Open your Nginx configuration (e.g., `/etc/nginx/sites-available/default`):

```nginx
server {
    listen 80;
    server_name your-domain.com; # Or your server IP address

    # 1. FRONTEND STATIC ASSETS (/aiday/ or root /)
    location /aiday/ {
        alias /path/to/Ai_day/frontend/dist/;
        index index.html;
        try_files $uri $uri/ /aiday/index.html;
    }

    # If serving at domain root instead of /aiday/, use this:
    location / {
        root /path/to/Ai_day/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 2. BACKEND API REVERSE PROXY (CRUCIAL TO FIX THE HTML JSON ERROR)
    location /cseAI/ {
        proxy_pass http://127.0.0.1:6007/cseAI/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    # 3. BACKEND UPLOADS (POSTERS / PAPERS)
    location /uploads/ {
        proxy_pass http://127.0.0.1:6007/uploads/;
        client_max_body_size 50M;
    }
}
```

Test and reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### Step 3: Option to point Frontend directly to Backend URL (Alternative)

If backend and frontend are hosted on separate servers or ports (e.g., Frontend on port 80 and Backend on port 6007 without Nginx proxy):
1. In `frontend/`:
   Create `.env.production` file:
   ```env
   VITE_API_BASE_URL=http://YOUR_SERVER_IP:6007/cseAI
   ```
2. Rebuild frontend:
   ```bash
   cd frontend
   npm run build
   ```
