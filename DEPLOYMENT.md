# 🚀 Deployment Guide

How the **VidTopUp** system is deployed, how to connect GitHub Actions to your servers, and how to set up every secret needed for auto-deploy on push to `main`.

> 💡 This file is the companion to the CI/CD status badges in [README.md](README.md).

---

## 📦 Deployment Targets

| Project | Package | Target | Auto-deploy on push to `main` touching |
|---|---|---|---|
| **Frontend** (customer site) | `frontend/` | **Vercel** → `topup.lorndavid.online` | `frontend/**` |
| **Admin** (dashboard) | `frontend-admin/` | **Vercel** → `admintopup.lorndavid.online` | `frontend-admin/**` |
| **Backend** (API) | `backend/` | **Docker on Debian 12 VM** → `topup-api.lorndavid.online` | `backend/**` |

Workflows live in `.github/workflows/`:

- `deploy-frontend.yml` — build → `vercel deploy --prebuilt --prod` → smoke test
- `deploy-admin.yml` — build → `vercel deploy --prebuilt --prod` → smoke test
- `deploy-backend.yml` — build Docker image → push to registry → SSH into VM → `docker compose pull` + `up -d` → health check → Telegram notify
- `rollback.yml` — manual emergency rollback (trigger from the Actions tab)
- `.github/actions/telegram-notify/action.yml` — reusable deploy alerts (start / success / failed / rollback)

---

## 🔑 GitHub Actions Secrets (Complete List)

Add these under **GitHub repo → Settings → Secrets and variables → Actions**.

| Secret | Used by | Description |
|---|---|---|
| `VERCEL_TOKEN` | frontend, admin | Vercel API token that authenticates every `vercel` CLI command |
| `VERCEL_ORG_ID` | frontend, admin | Your Vercel team/account ID (`orgId` from `.vercel/project.json`) |
| `VERCEL_PROJECT_ID_FRONTEND` | frontend | `projectId` from `frontend/.vercel/project.json` |
| `VERCEL_PROJECT_ID_ADMIN` | admin | `projectId` from `frontend-admin/.vercel/project.json` |
| `SSH_HOST` | backend | Your Debian VM's IP or hostname |
| `SSH_USERNAME` | backend | SSH user on the VM (e.g. `david`) |
| `SSH_PRIVATE_KEY` | backend | **Private** key of the dedicated CI key pair (see below) |
| `SSH_PORT` | backend | Optional — defaults to `22` if not set |
| `TELEGRAM_BOT_TOKEN` | all | Bot token from [@BotFather](https://t.me/BotFather) — deploy alerts |
| `TELEGRAM_CHAT_ID` | all | Chat ID from [@userinfobot](https://t.me/userinfobot) |

> ⚠️ Add secrets **without extra spaces** around the values — trailing whitespace is a common cause of "secret not found" style failures.

---

# 🔐 SSH Key Setup: GitHub Actions → Debian 12

This connects the `deploy-backend.yml` workflow to your VM so every push to `main` can deploy the backend via **Docker**. Docker is required on the VM.

## How the Workflow Uses the Key

`deploy-backend-docker.yml` does this on every run:

```bash
# Connect via SSH, pull the new Docker image, restart the container
ssh -i ~/.ssh/deploy_key -p ${{ env.SSH_PORT }} \
  ${{ env.SSH_USERNAME }}@${{ env.SSH_HOST }} "bash -s" << 'DEPLOY_SCRIPT'
  cd /var/www/topup-api
  docker compose pull backend
  docker compose up -d --no-deps backend
  sleep 10
  curl -f http://localhost:3001/api/health
DEPLOY_SCRIPT
```

What that means for you:

- **GitHub** needs the **private key** → stored as the `SSH_PRIVATE_KEY` secret
- **Your Debian VM** needs the matching **public key** → in `~/.ssh/authorized_keys`
- **`SSH_USERNAME`** must be the user the workflow logs in as (e.g. `david`)
- **Docker + Docker Compose must be installed and running** on the VM
- The VM needs `docker-compose.yml` + `.env` at `/var/www/topup-api/`

## Step 1 — Generate a Dedicated CI Key Pair

Generate the key **on your local Windows machine** (Git Bash or PowerShell). Use a **dedicated key for CI** — never reuse your personal SSH key.

```bash
# Git Bash on Windows
ssh-keygen -t ed25519 -C "github-actions-ci" -f ~/.ssh/deploy_key -N ""
```

What each flag means:

| Flag | Purpose |
|---|---|
| `-t ed25519` | Modern, fast, secure key type |
| `-C "github-actions-ci"` | Comment/label so you recognize it later |
| `-f ~/.ssh/deploy_key` | Filename — creates `deploy_key` + `deploy_key.pub` |
| `-N ""` | ⚠️ **Empty passphrase is REQUIRED** — the workflow has no way to enter one; a passphrase silently breaks every deploy |

Expected output:

```
Your identification has been saved in /c/Users/you/.ssh/deploy_key
Your public key has been saved in /c/Users/you/.ssh/deploy_key.pub
```

> ⚠️ **Old keys (RSA 1024/2048) won't work** — Debian 12 has `PubkeyAcceptedAlgorithms` restrictions. `ed25519` avoids this entirely. If you must use RSA, use `-t rsa -b 4096`.

## Step 2 — View Your Public Key

```bash
cat ~/.ssh/deploy_key.pub
```

It looks like this:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions-ci
```

Copy this entire line — you'll need it in Step 3.

## Step 3 — Install the Public Key on Your Debian VM

SSH into your VM, then run:

```bash
# On your Debian 12 VM
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "PASTE_YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

> Replace `PASTE_YOUR_PUBLIC_KEY_HERE` with the full `ssh-ed25519 ...` line from Step 2.

Verify it was installed correctly:

```bash
cat ~/.ssh/authorized_keys
# Should show exactly one line starting with "ssh-ed25519"
```

## Step 4 — Test the Key Locally (Before GitHub)

This catches mistakes *before* GitHub Actions fails. From your **Windows machine**:

```bash
ssh -i ~/.ssh/deploy_key david@YOUR_VM_IP
```

- Replace `YOUR_VM_IP` with your VM's IP (e.g. `192.168.1.50`) or hostname
- First connection asks about the fingerprint — type `yes`

✅ **Success** = you get a `david@debian:~$` prompt. Type `exit` to leave.

❌ **Permission denied** = the public key isn't in `authorized_keys`, or the username is wrong. Re-check Step 3.

## Step 5 — Add the SSH Secrets to GitHub

1. Open your repo: **https://github.com/lorndavid/topupweb**
2. Go to **Settings → Secrets and variables → Actions**
3. Click **New repository secret** and add these:

| Name | Value |
|---|---|
| `SSH_HOST` | Your VM's IP or hostname (e.g. `192.168.1.50`) |
| `SSH_USERNAME` | Your VM username (e.g. `david`) |
| `SSH_PRIVATE_KEY` | The **private** key — contents of `~/.ssh/deploy_key` (the file, NOT the `.pub`!) |
| `SSH_PORT` | Only if not `22` |

For `SSH_PRIVATE_KEY`, view the whole file and paste it exactly:

```bash
cat ~/.ssh/deploy_key
# Starts with: -----BEGIN OPENSSH PRIVATE KEY-----
```

## Step 6 — Verify End-to-End

Trigger the backend deploy manually (no code change needed):

1. Go to **Actions** tab → **🚀 Deploy Backend → Debian 12** workflow
2. Click **Run workflow** → **Run**
3. Watch the `deploy` job: it should SSH in, `git pull`, build, restart PM2, and pass the health check
4. You'll get a **Telegram "Deploy success"** alert if notifications are configured

---

# 🔑 Vercel Token & Project Linking

The frontend and admin workflows each need the Vercel project IDs. These live in `.vercel/project.json`, created when you link a local folder to a Vercel project.

## Step 1 — Create the Vercel API Token

1. Go to **https://vercel.com/account/tokens**
2. Click **Create Token** → name it `github-actions-ci`
3. Scope: **Full Account** (it deploys to both projects)
4. Set expiration (e.g. 90 days or none) → **Create**
5. **Copy the token immediately** — it's shown only once!

> ⚠️ This token is like a password — anyone with it can deploy to your Vercel. Never commit it to Git.

## Step 2 — Link Projects Locally to Get the IDs

Link the **frontend**:

```bash
cd D:\Video\topupwebsite\frontend
npx vercel link
```

When prompted:
- **Set up and deploy?** → `N` (it's already deployed)
- **Link to existing project?** → `Y`
- **Which scope?** → your account (`lorndavid`)
- **Which project?** → the user-site project

Link the **admin** the same way:

```bash
cd D:\Video\topupwebsite\frontend-admin
npx vercel link
```

Then read the IDs:

```bash
cat D:\Video\topupwebsite\frontend\.vercel\project.json
cat D:\Video\topupwebsite\frontend-admin\.vercel\project.json
```

You'll see something like:

```json
{ "projectId": "prj_abc123xyz", "orgId": "team_xyz789abc" }
```

📝 Copy both `projectId` values and the one `orgId` (usually identical in both files).

## Step 3 — Add the Vercel Secrets to GitHub

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | The token from Step 1 |
| `VERCEL_ORG_ID` | The `orgId` from Step 2 |
| `VERCEL_PROJECT_ID_FRONTEND` | `projectId` from `frontend/.vercel/project.json` |
| `VERCEL_PROJECT_ID_ADMIN` | `projectId` from `frontend-admin/.vercel/project.json` |

## Step 4 — Test It

- Go to **Actions** → **🚀 Deploy Frontend → Vercel** → **Run workflow**
- Watch the `deploy` job build and deploy, then the `smoke-test` job check the live site

---

# 📢 Telegram Notification Secrets

| Secret | Where to get it |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token |
| `TELEGRAM_CHAT_ID` | Message [@userinfobot](https://t.me/userinfobot) → `/start` → it replies with your ID |

If these aren't set, deploys still work — you just won't get alerts.

---

# ✅ First-Time Setup Checklist

1. [ ] Generate the CI SSH key pair (`deploy_key` / `deploy_key.pub`)
2. [ ] Install the public key in `~/.ssh/authorized_keys` on the Debian VM
3. [ ] Test `ssh -i ~/.ssh/deploy_key david@YOUR_VM_IP` locally
4. [ ] Create the Vercel API token
5. [ ] Link both `frontend/` and `frontend-admin/` with `npx vercel link`
6. [ ] Add **all 12 secrets** to GitHub Settings → Secrets and variables → Actions
7. [ ] Push the workflow files to `main`
8. [ ] Install Docker on the VM: `curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER`
9. [ ] Trigger each workflow manually once from the Actions tab
10. [ ] Confirm the README CI/CD badges turn green (they show gray until the first run)
11. [ ] Confirm Telegram alerts arrive

---

# 🛠️ Troubleshooting

## "Permission denied (publickey)" in the deploy job

| Possible cause | Fix |
|---|---|
| Public key not in `authorized_keys` | Re-run Step 3 on the VM |
| Wrong `SSH_USERNAME` | Check the username you use to SSH into the VM |
| `SSH_PRIVATE_KEY` is the `.pub` file | Paste the **private** key (`-----BEGIN OPENSSH PRIVATE KEY-----`) |
| Passphrase set on the key | Regenerate with `-N ""` |
| RSA key | Use `ed25519` (Debian 12 blocks old RSA) |
| Extra spaces in the secret | Re-add the secret with no leading/trailing whitespace |

## Backend deploy fails at Docker pull or container start

The workflow uses `docker compose pull` + `docker compose up -d` on the VM. If it fails, check the logs:

```bash
cd /var/www/topup-api
docker compose logs backend --tail 50
docker compose ps
```

Common fixes:
- **Image pull fails** → check your registry credentials and that the image was pushed successfully
- **Container exits immediately** → check `.env` has all required keys (especially `BAY2GAME_API_KEY`, `CUTLUY_API_KEY`, `MONGODB_URI`)
- **Health check fails** → verify MongoDB is reachable, `MONGODB_URI` points to the right host, and the backend port 3001 is listening

## Health check fails after deploy

```bash
curl http://localhost:3001/api/health        # on the VM
pm2 status
sudo systemctl status nginx
```

## Workflow badges stay gray

Badges show "no status" until each workflow has run at least once. Trigger them manually from the Actions tab.

---

# 🔄 Manual Deployment (Without GitHub Actions)

## Backend (Docker on the Debian VM)

### Full stack with Docker Compose (recommended)

```bash
cd /var/www/topup-api

# Build and start all services (backend + MongoDB)
docker compose up -d --build

# Check all services
docker compose ps

# View logs
docker compose logs -f backend

# Stop everything
docker compose down

# Restart just the backend after a code change
docker compose up -d --no-deps --build backend

# Health check
curl http://localhost:3001/api/health
```

### Single container (backend only, MongoDB on managed service)

```bash
cd /var/www/topup-api

# Pull and restart just the backend
docker compose pull backend
docker compose up -d --no-deps backend

# Check health
curl http://localhost:3001/api/health
```

## Frontend / Admin (from your local machine)

```bash
cd frontend        # or frontend-admin
npx vercel --prod
```

---

---

# 🐳 Docker Configuration

All three services now have Docker support with multi-stage builds.

## Project Structure

```
topupweb/
├── docker-compose.yml              # Production stack definitions
├── docker-compose.override.yml    # Local development (live reload)
├── docker-compose.vps.yml         # VPS/production with Cloudflare Tunnel
├── .env.example                   # Template for required env vars
├── backend/
│   ├── Dockerfile                 # Multi-stage: development → builder → production
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile                 # Multi-stage: development → builder → nginx
│   ├── nginx.conf                 # Nginx config with /api proxy to backend
│   └── .dockerignore
├── frontend-admin/
│   ├── Dockerfile                 # Multi-stage: development → builder → nginx
│   ├── nginx.conf                 # Nginx config with /api proxy to backend
│   └── .dockerignore
└── cloudflared/
    └── config.yml                 # Cloudflare Tunnel ingress rules
```

## Quick Start (Local Development)

```bash
# Copy the env template and fill in your values
cp .env.example .env
# Edit .env with your real API keys

# Build and start everything (backend + MongoDB + frontend dev + admin dev)
docker compose up -d --build

# Check all services
docker compose ps

# View logs
docker compose logs -f

# Stop everything
docker compose down

# Access points:
#   Backend API:   http://localhost:3001/api/health
#   Frontend dev:  http://localhost:5173
#   Admin dev:     http://localhost:5174
```

## Production Deployment (VPS)

```bash
# On your Debian 12 VPS
cd /var/www/topup-api

# Copy env template
cp .env.example .env
# Fill in real values (especially BAY2GAME_API_KEY, CUTLUY_API_KEY, MONGODB_URI)

# Build and start the full stack
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build

# Or use pre-built images from a registry:
# docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d

# Check status
docker compose -f docker-compose.yml -f docker-compose.vps.yml ps

# View logs
docker compose -f docker-compose.yml -f docker-compose.vps.yml logs -f
```

## Service Ports (Production)

| Service | Internal Port | Exposed Port |
|---|---|---|
| Backend API | 3001 | Not exposed publicly (via Cloudflare Tunnel only) |
| Frontend (customer) | 80 | Not exposed publicly (via Cloudflare Tunnel only) |
| Admin Dashboard | 80 | Not exposed publicly (via Cloudflare Tunnel only) |
| MongoDB | 27017 | Not exposed (internal network only) |

> 🔒 In production, **no ports are exposed to the public internet**. All traffic goes through the Cloudflare Tunnel, which provides DDoS protection, SSL, and access controls.

## Health Checks

| Service | Endpoint |
|---|---|
| Backend | `GET /api/health` |
| Frontend | `GET /` (returns 200) |
| Admin | `GET /` (returns 200) |
| MongoDB | `db.adminCommand('ping')` |

## Environment Variables

See `.env.example` for the complete list. Key variables:

- `MONGODB_URI` — MongoDB connection string (empty for local Docker DNS)
- `BAY2GAME_API_KEY` — Bay2Game merchant API key
- `CUTLUY_API_KEY` — CutLuy payment API key
- `CUTLUY_WEBHOOK_SECRET` — CutLuy webhook verification secret
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — Web Push notification keys
- `ADMIN_JWT_SECRET` — Admin dashboard JWT secret
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — Admin login credentials
- `CLOUDFLARE_TUNNEL_TOKEN` — Cloudflare Tunnel token (production only)

## Building Individual Images

```bash
# Build backend only
docker compose build backend

# Build frontend only
docker compose build frontend

# Build admin only
docker compose build admin

# Build all
docker compose build
```

## CI/CD Integration

The `deploy-backend-docker.yml` workflow:
1. Builds the backend Docker image on every push to `main`
2. Pushes it to Docker Hub (requires `DOCKER_USERNAME` + `DOCKER_PASSWORD` secrets)
3. SSHs into the Debian VM
4. Runs `docker compose pull backend` + `docker compose up -d --no-deps backend` on the VM
5. Verifies the health endpoint (`GET /api/health`)
6. Sends a Telegram notification (start → success/failed)

### Additional Secrets Needed

| Secret | Description |
|---|---|
| `DOCKER_USERNAME` | Your Docker Hub username (or registry username) |
| `DOCKER_PASSWORD` | Your Docker Hub password (or access token) |

For setup instructions, see the [SSH Key Setup](#-ssh-key-setup-github-actions--debian-12) section above.

---

For the full application setup, env vars, and payment flow, see [README.md](README.md).
