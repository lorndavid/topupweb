# 🚀 VidTopUp Production Deployment Guide

This guide covers deploying the complete **VidTopUp** stack using:
1. **Debian Machine**: Runs the **Backend API** and **MongoDB 7 Database** in Docker, securely exposed to the internet with zero open firewall ports via a **Cloudflare Tunnel** (`api.vidtopup.store`).
2. **Vercel**: Hosts the customer frontend (`vidtopup.store`) and admin dashboard (`admin.vidtopup.store`).
3. **Cloudflare**: Manages DNS, SSL/TLS encryption, and tunnel routing.

```
                      ┌──────────────────────────────────────┐
                      │              Cloudflare              │
                      │  (DNS, SSL/TLS, DDoS, CDN, Tunnels)  │
                      └──────────────────┬───────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
        ▼                                ▼                                ▼
  vidtopup.store                admin.vidtopup.store              api.vidtopup.store
(Customer Frontend)              (Admin Dashboard)                (Cloudflare Tunnel)
        │                                │                                │
        ▼                                ▼                                ▼
  Vercel Hosting                   Vercel Hosting                 Debian VPS (Docker)
(Build: Vue 3 + PWA)             (Build: Vue 3 Admin)          ┌───────────────────────┐
                                                               │ • cloudflared (Tunnel)│
                                                               │ • backend:3001 (API)  │
                                                               │ • mongo:7 (Internal)  │
                                                               │ • volume: mongo-data  │
                                                               └───────────────────────┘
```

---

## Part 1: Debian Machine Setup (Backend + MongoDB in Docker)

### Step 0 — Prerequisites on Debian

SSH into your Debian machine and install Docker Engine and the Docker Compose plugin:

```bash
# 1. Update packages
sudo apt update && sudo apt upgrade -y

# 2. Install Docker using official script
curl -fsSL https://get.docker.com | sh

# 3. Allow running docker without sudo
sudo usermod -aG docker $USER
newgrp docker

# 4. Verify installation
docker --version
docker compose version
```

---

### Step 1 — Create Cloudflare Tunnel in Cloudflare Dashboard

A Cloudflare Tunnel connects your Debian server directly to Cloudflare without opening any ports (like 80, 443, 3001, or 27017) on your server's firewall.

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Zero Trust** → **Networks** → **Tunnels**.
2. Click **Create a Tunnel** → select **Cloudflared** → name it `vidtopup-api`.
3. Under **Install and run a connector**, select **Docker**.
4. Look at the command shown; copy only the token portion after `--token` (a long base64 string). You will put this in your `.env` as `CLOUDFLARE_TUNNEL_TOKEN`.
5. Under **Public Hostname Page**:
   - **Subdomain**: `api`
   - **Domain**: `vidtopup.store` (your domain)
   - **Type**: `HTTP`
   - **URL**: `backend:3001`
   - **Additional application settings** → **HTTP Settings** → Enable **No TLS Verify** (if applicable) and under **WebSockets** ensure WebSockets are enabled.
6. Click **Save Hostname**.

---

### Step 2 — Set Up Project Folder on Debian

```bash
# Create project folder
sudo mkdir -p /var/www/topup-api
sudo chown -R $USER:$USER /var/www/topup-api
cd /var/www/topup-api
```

Clone the repository or copy the project files to `/var/www/topup-api`:

```bash
# If using git:
git clone <YOUR_GIT_REPO_URL> .

# Or make sure these files exist in /var/www/topup-api:
#   docker-compose.backend.yml
#   backend/
#   scripts/backup-mongo.sh
#   .env
```

Make the backup script executable:
```bash
chmod +x scripts/backup-mongo.sh
```

---

### Step 3 — Configure Production `.env`

Create and edit `.env` in `/var/www/topup-api/.env`:

```bash
nano /var/www/topup-api/.env
```

Fill in the required configuration:

```env
# ─── Environment & Ports ─────────────────────────────────────
NODE_ENV=production
PORT=3001

# ─── Database (Docker Internal Mongo) ─────────────────────────
# Uses internal Docker DNS name 'mongo' on the private network
MONGODB_DB_NAME=gametopup
MONGODB_URI=mongodb://mongo:27017/gametopup

# ─── Cloudflare Tunnel Token ──────────────────────────────────
# Paste the token from Cloudflare Zero Trust (Step 1)
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoi...your_token_here...

# ─── Frontend Origins (for CORS) ──────────────────────────────
FRONTEND_URL=https://vidtopup.store
ADMIN_FRONTEND_URL=https://admin.vidtopup.store

# ─── Bay2Game API (reseller top-up delivery) ──────────────────
BAY2GAME_API_URL=https://api.bay2game.xyz
BAY2GAME_API_KEY=your_real_bay2game_api_key

# ─── CutLuy Payment Gateway (ABA / Bakong KHQR) ───────────────
CUTLUY_API_KEY=ck_live_your_cutluy_api_key
CUTLUY_API_URL=https://cutluy.com/v1
CUTLUY_WEBHOOK_SECRET=your_cutluy_webhook_secret
CUTLUY_RETURN_URL=https://vidtopup.store/payment/success

# ─── Admin Dashboard Authentication ───────────────────────────
# Generate a strong random secret:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
ADMIN_JWT_SECRET=generate_a_secure_64_character_random_string_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_to_a_strong_password

# ─── Push Notifications (Web-Push VAPID) ──────────────────────
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@vidtopup.store

# ─── Notifications (Telegram) ─────────────────────────────────
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
NOTIFICATION_WEBHOOK_URL=

# ─── Store Metadata ───────────────────────────────────────────
MERCHANT_NAME=VidTopUp
MERCHANT_CITY=Phnom Penh
DEFAULT_CURRENCY=USD
```

---

### Step 4 — Start the Stack

Start MongoDB, the Backend API, and the Cloudflare Tunnel with one command:

```bash
docker compose -f docker-compose.backend.yml up -d --build
```

Check running containers:
```bash
docker compose -f docker-compose.backend.yml ps
```

You should see 3 healthy containers running:
- `vidtopup-mongo` (MongoDB 7 database, volume `topup-mongo-data`)
- `vidtopup-backend` (Node.js API on port 3001)
- `vidtopup-cloudflared` (Cloudflare Tunnel connector)

Check logs:
```bash
# Backend logs
docker compose -f docker-compose.backend.yml logs -f backend

# Cloudflare tunnel logs
docker compose -f docker-compose.backend.yml logs -f cloudflared

# MongoDB logs
docker compose -f docker-compose.backend.yml logs -f mongo
```

Verify the API is live through Cloudflare:
```bash
curl https://api.vidtopup.store/api/health
# Should return: {"success":true,"message":"Server is running",...}
```

---

### Step 5 — Set Up Automated Daily MongoDB Backups

To ensure your customer orders and price history are never lost, set up automated daily dumps:

1. Test the backup script:
   ```bash
   /var/www/topup-api/scripts/backup-mongo.sh
   ```
   Check that a gzipped archive is created in `/var/backups/topup-mongo/`.

2. Add a daily cron job (runs every night at 03:00 AM):
   ```bash
   crontab -e
   ```
   Add the following line:
   ```cron
   0 3 * * * /var/www/topup-api/scripts/backup-mongo.sh >> /var/log/mongo-backup.log 2>&1
   ```

---

## Part 2: Vercel Setup (Customer Store & Admin Dashboard)

Both frontends are optimized for deployment on Vercel with automatic rewrites and PWA support.

### Customer Store (`frontend/`):
1. In Vercel, click **Add New Project** → import your GitHub repository.
2. Set **Root Directory**: `frontend`.
3. **Build Command**: `npm run build` (or leave default, picked up from `vercel.json`).
4. **Environment Variables**:
   - `VITE_API_BASE_URL`: `https://api.vidtopup.store`
5. Click **Deploy**.
6. Under **Settings → Domains**, add your domain: `vidtopup.store` (and `www.vidtopup.store`).

### Admin Dashboard (`frontend-admin/`):
1. In Vercel, click **Add New Project** → import the same repository.
2. Set **Root Directory**: `frontend-admin`.
3. **Build Command**: `npm run build`.
4. **Environment Variables**:
   - `VITE_API_BASE_URL`: `https://api.vidtopup.store`
5. Click **Deploy**.
6. Under **Settings → Domains**, add your admin subdomain: `admin.vidtopup.store`.

---

## Part 3: Cloudflare Domain & DNS Settings

In your Cloudflare dashboard for `vidtopup.store`:

1. **DNS Records**:
   - `vidtopup.store` → CNAME to `cname.vercel-dns.com` (Proxied ☁️)
   - `www.vidtopup.store` → CNAME to `cname.vercel-dns.com` (Proxied ☁️)
   - `admin.vidtopup.store` → CNAME to `cname.vercel-dns.com` (Proxied ☁️)
   - `api.vidtopup.store` → Managed automatically by your Cloudflare Tunnel! (Do not edit manually).

2. **SSL/TLS Settings**:
   - Go to **SSL/TLS** → set encryption mode to **Full** or **Full (Strict)**.
   - *Never* use "Flexible", as it causes redirect loops with Vercel HTTPS.
   - Under **Edge Certificates** → enable **Always Use HTTPS** and **Automatic HTTPS Rewrites**.

3. **Network Settings**:
   - Go to **Network** → ensure **WebSockets** is toggled **ON** (needed for real-time payment updates).

---

## Part 4: Maintenance & Operational Commands

### Updating the Backend
When you push new backend code:
```bash
cd /var/www/topup-api
git pull
docker compose -f docker-compose.backend.yml up -d --build backend
```

### Restarting Services
```bash
docker compose -f docker-compose.backend.yml restart backend
```

### Restoring MongoDB From Backup
If you ever need to restore a backup:
```bash
docker exec -i vidtopup-mongo mongorestore --db=gametopup --archive --gzip < /var/backups/topup-mongo/mongo_gametopup_YYYYMMDD_HHMMSS.archive.gz
```
