# 🛠️ Local Development Guide (Windows)

How to run the **VidTopUp** stack locally for **testing** and for **day-to-day development with live reload**.

> ⚠️ These instructions are for **local work only**. For production/VPS deployment see `DEPLOYMENT.md`.

---

## Two ways to run locally

| Mode | What it is | Use it for |
|---|---|---|
| **A. Docker stack (full build)** | All 4 services (Mongo + backend + frontend + admin) as production-style containers | Testing the "real" built app end-to-end |
| **B. Dev workflow (live reload)** | Backend + Mongo in Docker, customer frontend & admin run with Vite on your machine | Editing code with hot reload |

Mode A is what you need to sanity-check the system works. Mode B is what you use when writing code.

---

## ✅ Prerequisites

- **Docker Desktop** (with Docker Compose) — check with `docker --version`
- **Node.js 18+** (tested with 20/22) — check with `node --version`
- **Real API keys** (needed for the *payment & top-up* features to actually work):
  - `BAY2GAME_API_KEY` — get from [@Bay2GameBot](https://t.me/Bay2GameBot) → `/start` → `/profile`
  - `CUTLUY_API_KEY` + `CUTLUY_WEBHOOK_SECRET` — get from the CutLuy dashboard (https://cutluy.com)
  - `ADMIN_PASSWORD` — whatever you want the admin dashboard password to be

Without the two API keys the site still **starts and browses fine**, but creating payments / delivering top-ups fails.

---

## 🚀 Mode A — Run the whole stack in Docker (testing)

This builds **production images** exactly like the VPS deployment and runs them locally.

### 1. Configure environment

A `.env` file already exists at the project root (created during setup, git-ignored). To recreate it from scratch:

```bash
cp .env.example .env
```

Then edit `.env` and put in your real keys:

| Variable | Value |
|---|---|
| `BAY2GAME_API_KEY` | your key from @Bay2GameBot |
| `CUTLUY_API_KEY` | your CutLuy key (`ck_...`) |
| `CUTLUY_WEBHOOK_SECRET` | any long random string (shared secret for webhook HMAC) |
| `ADMIN_PASSWORD` | admin dashboard password |
| `FRONTEND_URL` | `http://localhost:80` |
| `ADMIN_FRONTEND_URL` | `http://localhost:81` |

> `MONGODB_URI` stays **empty** locally — docker-compose automatically connects the backend to the internal `mongo` container. VAPID/JWT secrets are already generated.

### 2. Start everything

```bash
docker compose up -d --build
```

First run builds 3 images — takes a few minutes. Later runs are fast.

### 3. Verify

```bash
docker compose ps            # all 4 containers should be "healthy"
curl http://localhost:3001/api/health
```

| Service | URL | Login |
|---|---|---|
| Customer site (VidTopUp) | http://localhost | — |
| Admin dashboard | http://localhost:81 | `admin` / your `ADMIN_PASSWORD` |
| Backend API | http://localhost:3001 | — |
| MongoDB | `localhost:27017` (internal to Docker) | — |

### 4. Useful commands

```bash
docker compose logs -f backend      # follow backend logs
docker compose logs -f frontend     # follow nginx logs
docker compose down                 # stop everything (data kept)
docker compose down -v              # stop + wipe the Mongo volume (fresh DB)
docker compose build frontend       # rebuild one service after image changes
```

> 🔎 **Why can I reach `:3001`?** `docker-compose.override.yml` (git-ignored, machine-specific) publishes the backend port so you can curl the API directly during testing. `docker-compose.yml` alone leaves the backend internal-only.

---

## 💻 Mode B — Live-reload development workflow

Backend + Mongo keep running in Docker. The two Vue apps run with **Vite on your machine** so every save hot-reloads.

### Why this split?
- The backend (Express/tsx) is easy to keep in Docker — you edit `backend/src/`, the volume rebuild isn't needed because you can also run tsx natively. Pick whichever you like:
  - **Option 1 (recommended):** `docker compose up -d mongo backend` → backend in Docker. But there is **no volume mount / hot reload** for the backend in this setup — you must `docker compose up -d --build backend` after backend changes.
  - **Option 2 (true live reload for backend too):** run the backend natively with `tsx watch` (see below).
- The Vue apps are *much* nicer natively: `npm run dev` + Vite HMR.

### 1. Start Mongo + backend in Docker

```bash
docker compose up -d mongo backend
```

Wait for `topup-backend` to be `healthy`:

```bash
docker compose ps
```

### 2. Frontends natively (2 terminals)

```bash
# Terminal 1 — customer site
cd frontend
npm install          # first time only
npm run dev          # → http://localhost:5173
```

```bash
# Terminal 2 — admin dashboard
cd frontend-admin
npm install          # first time only
npm run dev          # → http://localhost:5174
```

Both Vite servers proxy `/api` and `/ws` to `http://localhost:3001` — which is exactly where the Docker backend listens (published by `docker-compose.override.yml`). No extra config needed.

### 3. Optional: backend natively (hot reload)

Instead of the Docker backend you can run it on your machine for instant backend reloads. You need a Mongo connection string:

```bash
cd backend
cp .env.example .env          # edit MONGODB_URI to point at your Mongo
npm install
npm run dev                   # tsx watch → http://localhost:3001
```

- If you use **Docker's Mongo**: set `MONGODB_URI=mongodb://localhost:27017/gametopup` (port 27017 is reachable because... actually the mongo container doesn't publish 27017). Easiest: add a temporary port to `docker-compose.override.yml` for mongo, or use Mode A and skip native backend.
- `NODE_ENV=development` unlocks the **dev-mode auto-pay simulation** (payment is auto-confirmed ~30 s after checkout so you can test the full order flow without real money).

### 4. URLs in dev mode

| App | URL |
|---|---|
| Customer site | http://localhost:5173 |
| Admin dashboard | http://localhost:5174 |
| Backend API | http://localhost:3001 |

> ⚠️ Don't run Mode A and Mode B at the same time if you want a single frontend experience — the Docker nginx containers occupy ports 80/81 while Vite uses 5173/5174, so they don't collide, but you'll have two copies of the same site.

---

## 🧪 Testing the payment flow without real money

1. Make sure `.env` has `NODE_ENV=development` **when running the backend natively**, OR no Bakong token is configured (Docker prod mode has no simulation).
2. Open the customer site, pick a game → package → enter a **fake player ID** → Verify → Checkout.
3. When the KHQR shows, wait ~30 s: in dev mode the backend auto-marks the order **paid** (no real bank needed) and tries to deliver via Bay2Game.
4. If `BAY2GAME_API_KEY` is real and the wallet has balance → order becomes `completed`. Otherwise the order goes to `awaiting_stock` (that's expected without a funded wallet).

To watch it live:

```bash
curl http://localhost:3001/api/health
docker compose logs -f backend
```

---

## 🧯 Fixes applied for local Docker (important if you pull fresh)

Three real bugs were fixed in this repo to make the Docker images run:

1. **`frontend-admin/public/` was missing** → Docker build failed (`COPY public`). Added the folder (`.gitkeep`).
2. **Bad nginx `pid_file=` directive** in both Dockerfiles → nginx crashed in a loop. Rewrote `frontend/nginx.conf` and `frontend-admin/nginx.conf` as full main configs (with `pid /app/run/nginx.pid;` inside), and Dockerfiles now `COPY nginx.conf /etc/nginx/nginx.conf`.
3. **Container health checks failed** — busybox `wget http://localhost/` resolves to IPv6 `::1`, where nginx doesn't listen. Health checks now use `http://127.0.0.1/`.

If your containers won't start, run:

```bash
docker compose ps
docker compose logs frontend --tail 50
docker compose logs admin --tail 50
docker compose logs backend --tail 50
```

---

## 📝 Quick reference

| Action | Command |
|---|---|
| Full Docker stack up | `docker compose up -d --build` |
| Full Docker stack down | `docker compose down` |
| Fresh DB | `docker compose down -v && docker compose up -d --build` |
| Rebuild backend only | `docker compose up -d --build backend` |
| Backend logs | `docker compose logs -f backend` |
| Admin login (default) | `admin` / `admin123` (or your `ADMIN_PASSWORD`) |
| Backend env file (native) | `backend/.env` (see `backend/.env.example`) |
| Root env file (Docker) | `.env` (see `.env.example`) |
