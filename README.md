# VidTopUp — KHQR Payment + Bay2Game Top-Up System

A game top-up website for Cambodia (**vidtopup.store**). Customers browse games, verify their player ID (Bay2Game Check API), choose a diamond/UC package, pay via **KHQR** (scan with any Cambodian banking app), and get their in-game items delivered automatically through the **Bay2Game Reseller API**.

---

## 🚀 CI/CD Status

Auto-deploys on every push to `main`:

| Project | Target | Status |
|---------|--------|--------|
| **Frontend** (customer site) | Vercel → `vidtopup.store` | [![Deploy Frontend](https://github.com/lorndavid/topupweb/actions/workflows/deploy-frontend.yml/badge.svg?branch=main)](https://github.com/lorndavid/topupweb/actions/workflows/deploy-frontend.yml) |
| **Admin** (dashboard) | Vercel → `admin.vidtopup.store` | [![Deploy Admin](https://github.com/lorndavid/topupweb/actions/workflows/deploy-admin.yml/badge.svg?branch=main)](https://github.com/lorndavid/topupweb/actions/workflows/deploy-admin.yml) |
| **Backend** (API) | Docker on Debian 12 VM → `api.vidtopup.store` | [![Deploy Backend](https://github.com/lorndavid/topupweb/actions/workflows/deploy-backend.yml/badge.svg?branch=main)](https://github.com/lorndavid/topupweb/actions/workflows/deploy-backend.yml) |

> ⚠️ Badges show **gray/no status** until each workflow has run at least once successfully.

📖 **Need to set up deploy secrets (SSH keys, Vercel tokens, Docker Hub, Telegram)?** See the full step-by-step guide in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 📋 Table of Contents

- [Repository Layout](#repository-layout)
- [System Architecture](#system-architecture)
- [Prerequisites & API Keys](#prerequisites--api-keys)
- [Environment Setup](#environment-setup)
- [Installation & Local Development](#installation--local-development)
- [Docker Deployment](#docker-deployment)
- [Complete Payment Flow (Step by Step)](#complete-payment-flow-step-by-step)
- [Order Lifecycle & Stock Retry](#order-lifecycle--stock-retry)
- [Admin Manual Confirm](#admin-manual-confirm)
- [Notifications (Telegram + Webhook + Push)](#notifications-telegram--webhook--push)
- [API Endpoints Reference](#api-endpoints-reference)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Troubleshooting](#troubleshooting)

---

## Repository Layout

Monorepo with **three independent npm packages** (no workspace tooling — install/run each separately):

| Package | Stack | Dev port | Notes |
|---|---|---|---|
| `frontend/` | Vue 3 SPA | 5173 | Customer-facing site, PWA (`vite-plugin-pwa`, `injectManifest`) |
| `frontend-admin/` | Vue 3 SPA | 5174 | Admin dashboard, served under base `/admin/` |
| `backend/` | Express + MongoDB (Mongoose) | 3001 | REST API + WebSocket + background schedulers |

---

## System Architecture

```
┌──────────────┐      ┌───────────────────────────────────────────┐      ┌──────────────┐
│   Customer    │      │            Docker Stack (VPS)             │      │  Bay2Game    │
│   (Browser)   │      │                                           │      │  (Reseller   │
│               │      │  ┌──────────┐  ┌───────────────────────┐  │      │    API)      │
│  Scans QR     │─────▶│  │ Frontend │──│        Backend        │  │─────▶│              │
│  with ABA/    │      │  │ (Vue 3,  │  │ (Express + MongoDB)   │  │      │  Processes   │
│  ACLEDA/Wing  │◀─────│  │  nginx)  │  │  CutLuy · Bay2Game ·  │  │◀─────│  top-up      │
│               │      │  │          │  │  WebSocket · Schedulers│  │      │              │
│  Pays via QR  │      │  └──────────┘  └───────────┬───────────┘  │      └──────────────┘
└───────┬───────┘      │  ┌──────────┐              │              │
        │              │  │  Admin   │              │              │
        │              │  │ (Vue 3,  │  ┌───────────▼───────────┐  │
        │              │  │  nginx)  │  │  MongoDB (internal)   │  │
        │              │  └──────────┘  └───────────────────────┘  │
        │              │  ┌─────────────────────────────────────┐  │
        │              │  │  Cloudflare Tunnel (cloudflared)    │  │
        │              │  │  vidtopup.store → frontend          │  │
        │              │  │  admin.vidtopup.store → admin       │  │
        │              │  │  api.vidtopup.store → backend       │  │
        │              │  └─────────────────────────────────────┘  │
        │              └───────────────────────────────────────────┘
        ▼                                │
┌──────────────────┐        ┌───────────────────────────┐
│   Your Bank App  │        │  CutLuy (ABA PayWay KHQR) │
│  (ABA, ACLEDA,   │        │  payment gateway — webhook│
│   Wing, Bakong)  │        │  HMAC-verified            │
└──────────────────┘        └───────────────────────────┘
```

In **production no ports are exposed to the public internet** — all traffic enters through the Cloudflare Tunnel (DDoS protection, SSL, access controls). In **local Docker** the frontend is on port 80 and the admin on 81.

### Key External Services

| Service | Purpose | Required? |
|---------|---------|-----------|
| **Bay2Game API** (`api.bay2game.xyz`) | Fetches games/products, validates player IDs, processes top-up orders | ✅ **Required** |
| **CutLuy** (`cutluy.com`) | KHQR payment gateway (ABA PayWay). Creates the KHQR, reports payment status via API + webhook | ✅ **Required** |
| **MongoDB** | Stores orders, game cache, price history, product overrides, announcements | ✅ **Required** |
| **Cloudflare Tunnel** | Exposes the Docker stack to `vidtopup.store` / `admin.vidtopup.store` / `api.vidtopup.store` | ✅ Production |
| **Telegram Bot** | Stock/daily alerts to admin + deploy notifications | ❌ Optional |
| **Notification Webhook** | Custom webhook for order events | ❌ Optional |
| **Web Push (VAPID)** | Browser push notifications to customers | ❌ Optional |

---

## Prerequisites & API Keys

### 1. Bay2Game API Key (REQUIRED)

1. Open Telegram and start [@Bay2GameBot](https://t.me/Bay2GameBot)
2. Send `/start` to create your account (auto-created)
3. Send `/profile` to get your **API Key**
4. Top up your balance via **USDT** (TRC20, BEP20, Polygon) or **KHQR** (all Cambodian banks)
5. Visit [Bay2Game Partner Dashboard](https://bay2game.xyz/partners/login.php) to view orders, export products, check funding history, and track sales

### 2. CutLuy API Key (REQUIRED)

The payment gateway. Create a store on the [CutLuy dashboard](https://cutluy.com), configure your **ABA PayWay payment link** in the store settings, then grab:

- `CUTLUY_API_KEY` — API key (`ck_...`)
- `CUTLUY_WEBHOOK_SECRET` — shared secret used to HMAC-verify webhooks

CutLuy handles the ABA PayWay integration internally — the backend just sends amount + reference and gets back a raw KHQR string, a QR image, and a checkout URL.

### 3. MongoDB URI (REQUIRED)

Orders, game cache, price history, product overrides, and announcements are stored in MongoDB.
- Local Docker: leave `MONGODB_URI` empty — compose connects to the internal `mongo` container
- Production: use [MongoDB Atlas](https://www.mongodb.com/atlas) (or the bundled `mongo` service) and set the connection string

### 4. VAPID Keys (OPTIONAL but recommended for push notifications)

Generate with:

```bash
npx web-push generate-vapid-keys
```

---

## Environment Setup

Create a root `.env` from the template:

```bash
cp .env.example .env
```

```env
# ─── Database ────────────────────────────────────
MONGODB_DB_NAME=gametopup
# For local Docker Compose: leave MONGODB_URI empty — it uses internal Docker DNS
# For production: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/gametopup

# ─── Bay2Game (REQUIRED) ────────────────────────
BAY2GAME_API_URL=https://api.bay2game.xyz
BAY2GAME_API_KEY=your_bay2game_api_key_here

# ─── CutLuy Payment (REQUIRED) ──────────────────
CUTLUY_API_KEY=ck_live_your_cutluy_api_key_here
CUTLUY_API_URL=https://cutluy.com/v1
CUTLUY_WEBHOOK_SECRET=your_cutluy_webhook_secret
CUTLUY_RETURN_URL=https://vidtopup.store/payment/success

# ─── Frontend URLs (CORS + webhook return) ──────
FRONTEND_URL=https://vidtopup.store
ADMIN_FRONTEND_URL=https://admin.vidtopup.store

# ─── Push Notifications (web-push VAPID) ────────
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@vidtopup.store

# ─── Telegram (optional) ─────────────────────────
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
NOTIFICATION_WEBHOOK_URL=

# ─── Admin Auth ──────────────────────────────────
ADMIN_JWT_SECRET=your_secure_jwt_secret_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# ─── Merchant Info (displayed on the KHQR) ───────
MERCHANT_NAME=MY SHOP
MERCHANT_CITY=Phnom Penh
DEFAULT_CURRENCY=USD
```

> 🔒 The root `.env` (Docker) is git-ignored. The backend also reads `backend/.env` when run natively — see `backend/.env.example`.

---

## Installation & Local Development

### Option A — Full Docker stack (recommended for testing)

```bash
docker compose up -d --build
docker compose ps          # all 4 containers should be "healthy"
curl http://localhost:3001/api/health
```

| Service | URL |
|---|---|
| Customer site | http://localhost |
| Admin dashboard | http://localhost:81 (`admin` / your `ADMIN_PASSWORD`) |
| Backend API | http://localhost:3001 |
| MongoDB | internal to Docker |

### Option B — Live-reload dev workflow

```bash
# Terminal 1 — backend (or keep it in Docker: docker compose up -d mongo backend)
cd backend
npm install
npm run dev                # tsx watch → http://localhost:3001

# Terminal 2 — customer site
cd frontend
npm install
npm run dev                # Vite → http://localhost:5173

# Terminal 3 — admin dashboard
cd frontend-admin
npm install
npm run dev                # Vite → http://localhost:5174
```

Both Vite servers proxy `/api` (and `/ws`) to `localhost:3001`, so no CORS issues in dev.

> ⚠️ These are **local** instructions. For production deployment see [DEPLOYMENT.md](DEPLOYMENT.md) and the section below.

---

## Docker Deployment

The whole stack (MongoDB + backend + frontend + admin + cloudflared) runs as Docker containers on a Debian 12 VPS.

### Production (VPS + Cloudflare Tunnel)

```bash
cd /var/www/topup-api        # or wherever the repo lives on the VPS
cp .env.example .env         # fill in real values

# Build the stack (or pull pre-built images from GHCR/Docker Hub)
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
```

`docker-compose.vps.yml` adds the **cloudflared sidecar**, which exposes:

| Hostname | Service |
|---|---|
| `vidtopup.store` / `www.vidtopup.store` | frontend (nginx) |
| `admin.vidtopup.store` | admin (nginx) |
| `api.vidtopup.store` | backend (Express) |

Tunnel ingress rules live in [`cloudflared/config.yml`](cloudflared/config.yml) — set the `CLOUDFLARE_TUNNEL_TOKEN` env var (Cloudflare Zero Trust → Networks → Tunnels) and point the DNS records at your tunnel.

> 🔒 **Security model:** no firewall ports are opened for the app — the tunnel is the only ingress. MongoDB is on an internal Docker network.

### CI/CD

- `deploy-backend.yml` — builds the backend image → pushes to Docker Hub → SSHes into the VPS → `docker compose pull backend && docker compose up -d --no-deps backend` → health check → Telegram notify
- `deploy-frontend.yml` / `deploy-admin.yml` — type-check → build → deploy to Vercel → smoke test
- `rollback.yml` — manual emergency rollback
- `.github/actions/telegram-notify/` — reusable deploy alerts

All required GitHub Actions secrets (Vercel tokens, SSH key, Docker Hub credentials, Telegram) are documented in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Complete Payment Flow (Step by Step)

### 👤 Customer Flow

```
HOME                 GAME DETAIL              CHECKOUT              STATUS
────                 ───────────              ────────              ──────

Browse games  ──▶  Select game           ──▶  Review order       ──▶  View
                    Choose package             summary                  order
                    Enter Player ID     ┌───── Confirm with      ┌──── status
                    Verify player       │     KHQR               │    (completed/
                    (Bay2Game check)    │                        │     failed)
                                        ▼                        │
                                 ┌──────────────┐                │
                                 │  KHQR Card   │                │
                                 │  ┌────────┐  │   Payment      │
                                 │  │ QR Code│  │   detected?    │
                                 │  └────────┘  │  ────────────  │
                                 │  ↓ Scan with │  Yes ──────▶  ──┘
                                 │    banking   │  No  ──▶ Wait & retry
                                 │    app       │
                                 │              │  (or admin
                                 │  [Download]  │   manually
                                 │  [Share]     │   confirms)
                                 └──────────────┘
```

### 🛠️ Detailed Flow

**Step 1: Customer visits the site** — `https://vidtopup.store` — sees featured games (MLBB, Free Fire, PUBG, Honor of Kings) + all Bay2Game games. Searchable.

**Step 2: Customer selects a game** — `/game/:gameCode` → chooses a package, enters their Player ID (+ Server ID if required), clicks **Verify Player** → backend calls the Bay2Game Check ID API and returns the player nickname.

**Step 3: Checkout + KHQR generation**

`POST /api/payment/create`:
1. Creates the order in MongoDB with `order_status: awaiting_payment`
2. Calls CutLuy `POST /payments` (amount + order reference) → CutLuy returns a raw **KHQR string**, a **checkout URL**, and payment ID (the underlying ABA PayWay payment link processes the transaction)
3. Generates a QR PNG from the raw KHQR string and returns it to the frontend

**Step 4: Customer scans and pays** — any Cambodian banking app (ABA, ACLEDA, Wing, Bakong, Sathapana…) scans the QR and confirms the payment.

**Step 5: Payment detection (3 ways)**

1. **CutLuy webhook (primary)** — `POST /api/webhooks/cutluy`. CutLuy pushes `payment.completed` / `payment.expired` / `payment.failed`. The signature header `X-CutLuy-Signature` (`t=<timestamp>,v1=<hex>`) is verified with HMAC-SHA256 over `t + "." + rawBody` using `CUTLUY_WEBHOOK_SECRET` (rejects events older than 5 minutes).
2. **Frontend polling (backup)** — polls `GET /api/payment/status/:reference` every **3 seconds**, which checks the CutLuy API directly. After **5 minutes** unpaid the order auto-fails.
3. **Admin manual confirm (fallback)** — `POST /api/payment/manual-confirm/:reference` after verifying the money arrived.

**Step 6: Top-up processing**

Once paid → `processTopUp()` calls Bay2Game `create_order`:

```
Payment Confirmed
       │
       ▼
┌──────────────────┐     SUCCESS     ┌──────────────────┐
│ processTopUp()   │───────────────▶│ completed +       │
│                  │                │ push/Telegram     │
│ Calls Bay2Game   │                │ notifications     │
│ create_order     │                └──────────────────┘
└────────┬─────────┘
         │
         │ INSUFFICIENT_BALANCE
         ▼
┌──────────────────┐
│ awaiting_stock   │
│                  │
│ Telegram alert   │
│ Webhook alert    │
│ Auto-retry       │
│ (see below)      │
└──────────────────┘
```

Real-time status is streamed to the customer's browser over **WebSocket** (`/ws`, keyed by order reference).

---

## Order Lifecycle & Stock Retry

```
pending → awaiting_payment → paid → processing → completed
                 │
                 ├─ (5 min timeout) ──▶ failed
                 └─ (cancelled) ───────▶ cancelled

paid ──▶ processing ──▶ completed
   └── INSUFFICIENT_BALANCE ──▶ awaiting_stock ──(retry loop)──▶ completed
                                     └─ (1440 retries ≈ 24h) ──▶ failed
```

- Orders are referenced by a unique `TUP...` reference (`REFERENCE_PREFIX`)
- When Bay2Game returns insufficient balance, the order enters `awaiting_stock` — **not** failed — and a background scheduler retries every `STOCK_RETRY_INTERVAL` (60s), up to `STOCK_RETRY_MAX` (1440 ≈ 24h)
- Each retry uses exponential backoff (30s → 60s → 120s → … capped at 1 hour)
- When the wallet is topped up, the order auto-completes and a **"Stock Delivered!"** alert is sent

### Manual retry

```bash
curl -X POST http://localhost:3001/api/order/TUP-ABC123-DEF456/retry
```

---

## Admin Manual Confirm

**Fallback when webhook/auto-detection doesn't fire** (e.g. payment went through but CutLuy didn't push):

1. Wait 30 seconds after checkout (button appears after 30s — prevents accidental clicks)
2. **Check your bank app** — verify the money actually arrived
3. Click **"I've Paid — Confirm & Process"** in the admin dashboard
4. The order is marked paid and the Bay2Game top-up starts immediately

> ⚠️ **Only confirm after verifying the money is in your bank account.** Manual confirmation immediately triggers the top-up, which deducts from your Bay2Game balance.

---

## Notifications (Telegram + Webhook + Push)

- **Telegram** (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`) — stock alerts, order-completed alerts, daily summary (sent daily at 20:00 Cambodia time, UTC+7), deploy notifications
- **Generic webhook** (`NOTIFICATION_WEBHOOK_URL`) — same events as Telegram, POSTed as JSON (Discord/Slack/custom)
- **Web Push** (VAPID keys) — browser push to the customer when their order completes

Test your notification config:

```bash
curl -X POST http://localhost:3001/api/webhook/test
```

---

## API Endpoints Reference

> Admin routes require `Authorization: Bearer <token>` (login via `POST /api/admin/login`).

### Games & Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | All Bay2Game games |
| GET | `/api/cambodia-games` | Featured + all games (sorted) |
| GET | `/api/products/:gameCode` | Products for a specific game |
| GET | `/sitemap.xml` | Dynamic XML sitemap (home + every game page) |

### Player Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verify-player` | Verify player ID via Bay2Game Check API |
| GET | `/api/check-id` | Direct Bay2Game check (query params) |

### Payment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/create` | Create order + CutLuy KHQR |
| GET | `/api/payment/status/:reference` | Poll payment status (3s) |
| POST | `/api/webhooks/cutluy` | CutLuy webhook (HMAC-verified) |
| POST | `/api/payment/manual-confirm/:reference` | Admin: manually confirm payment |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/order` | Create order (after payment) |
| GET | `/api/order/:reference` | Get order details |
| GET | `/api/orders/player/:playerId` | Orders for a player |
| POST | `/api/order/:reference/cancel` | Cancel pending order |
| POST | `/api/order/:reference/retry` | Retry awaiting_stock order |

### Webhooks & Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhook/stock-alert` | Receive external stock alerts |
| GET | `/api/webhook/recent-alerts` | View recent alerts |
| POST | `/api/webhook/test` | Test Telegram + webhook config |
| POST | `/api/webhook/daily-summary` | Trigger the daily summary manually |

### Push Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/push/subscribe` | Subscribe a browser to web-push |
| POST | `/api/push/unsubscribe` | Unsubscribe a browser |
| GET | `/api/push/stats` | Subscription stats |
| GET | `/api/push/vapid-key` | Public VAPID key |

### Site Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/announcements` | Active announcements |
| GET | `/api/price-drops/:gameCode` | Recent price drops for a game |
| GET | `/api/config/new-products` | Recently added products |
| POST | `/api/analytics/track` | Anonymous event tracking |
| GET | `/api/balance` | Bay2Game reseller balance |

### Admin (JWT-protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Login with username/password |
| POST | `/api/admin/login/apikey` | Login with Bay2Game API key |
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET | `/api/admin/orders` / `/api/admin/orders/:reference` | Orders list / detail |
| POST | `/api/admin/orders/:reference/status` | Update order status |
| GET | `/api/admin/products` | Product list with profit overrides |
| PUT | `/api/admin/products/profit` | Set product profit % |
| DELETE | `/api/admin/products/override/:productCode` | Remove a profit override |
| GET/POST | `/api/admin/profit-margins` (+ `/batch`) | Profit margin presets |
| GET | `/api/admin/games` | Game list w/ cache refresh |
| GET | `/api/admin/analytics` | Analytics dashboard data |
| GET | `/api/admin/funding-history` | Bay2Game funding history |
| GET | `/api/admin/balance-alert` | Low-balance alert state |
| GET/POST | `/api/admin/webhooks` (+ `/test`) | Webhook config & test |
| POST | `/api/admin/check-player-id` | Verify a player ID manually |
| GET | `/api/admin/direct-order/games` + `/products/:gameCode` | Direct order pickers |
| POST | `/api/admin/direct-order/create` | Create a top-up directly |
| GET/POST | `/api/admin/announcements` (+ `/:id` PUT/DELETE, `/:id/toggle` PATCH) | Manage announcements |

---

## Project Structure

```
├── docker-compose.yml            # Local/production stack (mongo, backend, frontend:80, admin:81)
├── docker-compose.vps.yml        # Production override: pre-built images + cloudflared sidecar
├── docker-compose.override.yml   # (git-ignored) machine-specific local tweaks
├── cloudflared/config.yml        # Cloudflare Tunnel ingress rules
├── .env.example                  # Template for the root .env
├── backend/
│   ├── Dockerfile                # Multi-stage: dev → builder → production
│   └── src/
│       ├── app.ts                # Express app (helmet, CORS, raw-body CutLuy webhook)
│       ├── server.ts             # Entry: HTTP + WebSocket + background schedulers
│       ├── services/
│       │   ├── cutluy.service.ts        # KHQR payment creation + webhook HMAC verification
│       │   ├── bay2game.service.ts      # Bay2Game top-up orders
│       │   ├── bay2gameCheck.service.ts # Player-ID verification
│       │   ├── gameLookup.service.ts    # Game-specific player lookups
│       │   ├── order.service.ts         # Order state machine + stock retry
│       │   ├── notification.service.ts  # Telegram + webhook alerts, daily summary
│       │   ├── pushNotification.service.ts # Web-push (VAPID) notifications
│       │   └── websocket.service.ts     # Real-time order updates keyed by reference
│       ├── controllers/          # Thin Express handlers (admin split into admin*.controller.ts)
│       ├── repositories/         # MongoDB data access
│       ├── models/               # Mongoose schemas (Order, GameCache, PriceHistory, …)
│       ├── middleware/           # errorHandler.ts (AppError), auth
│       ├── validators/           # Zod schemas
│       ├── config/               # env → typed config + database.ts
│       ├── constants/            # ORDER_STATUS, limits, etc.
│       ├── routes/index.ts       # ALL routes registered here
│       └── utils/                # axios instance, reference generator
├── frontend/
│   ├── Dockerfile + nginx.conf   # Builds to nginx; proxies /api + /ws to backend
│   └── src/
│       ├── views/                # Home, GameDetail, Checkout, OrderStatus…
│       ├── components/           # KHQRCard, ProductCard, ReceiptCard, Navbar, Footer…
│       ├── composables/          # useCurrency, useSavedPlayers, useMeta, useJsonLd…
│       ├── stores/               # Pinia stores
│       ├── services/api.ts       # Single axios instance
│       ├── i18n/                 # Khmer / English
│       └── sw.ts                 # PWA service worker
└── frontend-admin/
    ├── Dockerfile + nginx.conf   # Same nginx setup as frontend
    └── src/
        ├── views/                # Dashboard, Orders, Products, Settings, Login…
        ├── components/ui/        # DataTable, Modal, SlideOver, StatsCard
        ├── layouts/Sidebar.vue
        └── router (base /admin/)
```

---

## Tech Stack

- **Frontend:** Vue 3, Vite, TypeScript, TailwindCSS, Pinia, Vue Router, GSAP, PWA (`vite-plugin-pwa`)
- **Admin:** same stack + Chart.js (`vue-chartjs`)
- **Backend:** Node.js, Express, TypeScript, MongoDB (Mongoose), Zod, `ws`, `web-push`
- **External APIs:** Bay2Game (`api.bay2game.xyz`), CutLuy (`cutluy.com`), Telegram Bot API
- **Infra:** Docker Compose, nginx, Cloudflare Tunnel, GitHub Actions, Vercel

---

## Troubleshooting

### Payment never auto-detected

| Possible Cause | Solution |
|----------------|----------|
| CutLuy webhook not configured | Set `CUTLUY_WEBHOOK_SECRET` and register the webhook URL (`https://api.vidtopup.store/api/webhooks/cutluy`) in the CutLuy dashboard |
| Webhook signature failing | The raw body must reach the handler unmodified — see the `express.raw()` ordering note in `backend/src/app.ts` |
| Webhook still not arriving | Frontend polling (`/api/payment/status/:reference`) covers this — it checks CutLuy directly every 3s |
| Nothing works | Use the admin manual-confirm button after verifying the payment in your bank app |

### Order not appearing / not delivering in Bay2Game

| Possible Cause | Solution |
|----------------|----------|
| Payment never confirmed | Check `payment_status` in MongoDB |
| `BAY2GAME_API_KEY` wrong | Verify with `/profile` on @Bay2GameBot |
| Insufficient balance | Add funds to your Bay2Game wallet — the order auto-retries in `awaiting_stock` |
| Manual confirm not used | Click "I've Paid — Confirm & Process" after verifying receipt |

### TypeScript compilation errors

```bash
# Backend
cd backend && npx tsc --noEmit

# Frontend / Admin
cd frontend && npx vue-tsc --noEmit
cd frontend-admin && npx vue-tsc --noEmit
```

### Docker containers won't start

```bash
docker compose ps
docker compose logs frontend --tail 50
docker compose logs admin --tail 50
docker compose logs backend --tail 50
```

Common causes: missing env keys (`BAY2GAME_API_KEY`, `CUTLUY_API_KEY`, `MONGODB_URI`), MongoDB unreachable, or port 80/81 already in use.

### Server won't start (native)

```bash
cd backend && npm run dev
# Look for: "⚠️  Missing environment variables: ..."
```

---

📖 **More docs:** [DEVELOPMENT.md](DEVELOPMENT.md) — local dev in detail · [DEPLOYMENT.md](DEPLOYMENT.md) — production setup, secrets, and CI/CD.