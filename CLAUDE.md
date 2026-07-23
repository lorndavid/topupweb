# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VidTopUp** — a game top-up website for Cambodia. Customer flow: select a game → verify player ID (Bay2Game check API) → choose a diamond/UC package → pay via **KHQR** → automated in-game delivery via the **Bay2Game reseller API**.

> ⚠️ **Payment provider:** the codebase uses **CutLuy** (ABA PayWay KHQR) as the payment gateway — see `backend/src/services/cutluy.service.ts`, `config.cutluy`, and the `/api/webhooks/cutluy` route. The top-level `README.md` describes an older direct-Bakong integration and is **out of date** on payment specifics; trust the code and this file over the README there.

Monorepo with three independent npm packages (no workspace tooling — install/run each separately):

| Package | Stack | Dev port | Notes |
|---|---|---|---|
| `frontend/` | Vue 3 SPA | 5173 | Customer-facing, PWA (`vite-plugin-pwa`, `injectManifest`) |
| `frontend-admin/` | Vue 3 SPA | 5174 | Admin dashboard, served under base `/admin/` |
| `backend/` | Express + MongoDB (Mongoose) | 3001 | REST API + WebSocket + background schedulers |

## Commands

Run these from inside each package directory.

```bash
# backend/  (tsx for dev, tsc for build — NOT nodemon)
npm run dev        # tsx watch src/server.ts — hot reload on :3001
npm run build      # tsc → dist/
npm start          # node dist/server.js
npm run lint       # eslint src --ext .ts
npm run format     # prettier --write

# frontend/  and  frontend-admin/
npm run dev        # vite dev server (5173 / 5174)
npm run build      # vue-tsc -b && vite build  (build also type-checks)
npm run preview    # preview production build
npm run lint       # frontend only: eslint . --ext .vue,.ts --fix
```

**Type-checking only (no emit):**
```bash
cd backend && npx tsc --noEmit
cd frontend && npx vue-tsc --noEmit     # same for frontend-admin
```

**Tests:** there is no test runner configured in any package. Do not assume `npm test` exists.

**Local dev needs all three running** plus a reachable MongoDB. Both Vite servers proxy `/api` (and frontend also proxies `/ws`) to `localhost:3001`, so there are no CORS issues in dev. If the backend port is stuck: `taskkill /F /IM node.exe` (Windows dev environment).

## Architecture

### Backend request pipeline (`backend/src/`)

Layered — keep controllers thin and push logic down:

```
routes/index.ts   → single file registering ALL routes (public + JWT-protected /admin/*)
controllers/      → thin Express handlers (req/res); admin split across admin*.controller.ts
services/         → business logic (see below)
repositories/     → MongoDB data access; models never queried directly from controllers
models/           → Mongoose schemas: Order, GameCache, PriceHistory, ProductOverride, Announcement
middleware/       → errorHandler.ts: AppError class + global handler + notFoundHandler
validators/       → Zod schemas
config/           → index.ts (env → typed config, validateConfig warns on missing keys) + database.ts
```

Entry points: `app.ts` builds the Express app (helmet, CORS allow-list, body parsing); `server.ts` starts it, attaches WebSocket, and launches schedulers.

**Key services:**
- `cutluy.service.ts` — creates KHQR payment, verifies webhook HMAC signature
- `bay2game.service.ts` — creates the actual top-up order (reference **required, unique**)
- `bay2gameCheck.service.ts` / `gameLookup.service.ts` — player-ID verification + game lookup
- `order.service.ts` — order state machine + `retryAwaitingOrders()` (called by scheduler)
- `notification.service.ts` — Telegram + generic webhook alerts, daily summary
- `pushNotification.service.ts` — web-push (VAPID) browser notifications
- `websocket.service.ts` — single `ws` server, emits order updates keyed by reference

**Two background schedulers run in `server.ts`:**
1. **Stock retry** — every `STOCK_RETRY_INTERVAL` (60s), retries `awaiting_stock` orders (up to `STOCK_RETRY_MAX` = 1440 ≈ 24h). Orders land here when Bay2Game returns insufficient balance.
2. **Daily summary** — checks hourly, sends a Telegram report at 20:00 Cambodia time (UTC+7).

### Order lifecycle

`ORDER_STATUS` (constants/index.ts): `pending → awaiting_payment → paid → processing → completed`, with `awaiting_stock` (retry loop), `failed`, `cancelled` as branches. Order references are prefixed `TUP` (`REFERENCE_PREFIX`).

Payment flow:
1. `POST /api/payment/create` → creates order + CutLuy KHQR
2. Frontend polls `GET /api/payment/status/:reference` every `PAYMENT_POLL_INTERVAL` (3s), timing out at `PAYMENT_POLL_TIMEOUT` (5min)
3. `POST /api/webhooks/cutluy` → CutLuy pushes payment status (**HMAC-verified**)
4. `POST /api/payment/manual-confirm/:reference` → admin fallback when webhook/auto-detect fails
5. On paid → `order.service` calls Bay2Game; success → `completed`, insufficient balance → `awaiting_stock`

**CutLuy webhook signature gotcha:** `app.ts` registers `express.raw()` for `/api/webhooks/cutluy` *before* `express.json()`, stashes the raw string on `req.rawBody` for HMAC verification, then manually JSON-parses. Don't move the JSON body parser above this or signature checks break.

### Frontend (`frontend/src/`)

Vue 3 `<script setup lang="ts">` + Pinia + Vue Router + Tailwind + GSAP. Standard layout: `views/` (Home, GameDetail, Checkout, OrderStatus), `components/`, `composables/` (`useCurrency`, `useSavedPlayers`, `useAnimationTiming`…), `stores/`, `services/api.ts` (single axios instance), `i18n/` (Khmer/English). PWA service worker is `src/sw.ts`.

### Admin (`frontend-admin/src/`)

Same Vue stack + Chart.js (`vue-chartjs`). JWT auth: axios interceptor attaches `Authorization: Bearer <token>`; token in `localStorage` as `admin_token`; backend `verifyToken` middleware guards every `/api/admin/*` route and sets `req.user`. Reusable UI kit under `components/ui/` (DataTable, Modal, SlideOver, StatsCard). Router base is `/admin/`.

## Conventions

- **TypeScript:** `interface` for object shapes, `type` for unions/primitives; `import type` for type-only imports; `async/await` (never raw `.then()`); prefer `const`.
- **Backend errors:** `throw new AppError(message, statusCode)` — the global handler formats the response.
- **API response shape:** success `{ success: true, data, message? }`; error `{ success: false, message }`.
- **Vue:** always `<script setup lang="ts">` (never Options API); `defineProps<{}>()` / `defineEmits<{}>()` with generics; components PascalCase in script, kebab-case in template.
- **Imports:** use the `@/` alias (→ `src/`) in both frontend packages, not relative paths.
- **GSAP:** timeline-based sequences; pull durations/eases from `useAnimationTiming`; `gsap.registerPlugin(ScrollTrigger)` before use; prefer Vue `<Transition>` for simple enter/leave.
- **Formatting:** 2-space indent, semicolons, single quotes in TS, trailing commas in TS objects.
- **Dependencies:** check `package.json` before adding anything; prefer existing libs / Tailwind / browser APIs.

## Environment (`backend/.env`)

`validateConfig()` warns (does not crash) if `BAY2GAME_API_KEY`, `CUTLUY_API_KEY`, or `MONGODB_URI` are missing. Config is centralized in `config/index.ts` — read env vars there, not via scattered `process.env`.

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=gametopup

BAY2GAME_API_KEY=...              # required — top-up delivery
CUTLUY_API_KEY=...                # required — payment gateway
CUTLUY_WEBHOOK_SECRET=...         # HMAC verification for webhook
CUTLUY_API_URL=https://cutluy.com/v1
CUTLUY_RETURN_URL=...

MERCHANT_NAME=...
MERCHANT_CITY=Phnom Penh

ADMIN_JWT_SECRET=...              # falls back to JWT_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

VAPID_PUBLIC_KEY=...              # web-push notifications
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:...

TELEGRAM_BOT_TOKEN=...            # optional — stock/daily alerts
TELEGRAM_CHAT_ID=...
NOTIFICATION_WEBHOOK_URL=...      # optional
EXTRA_CORS_ORIGINS=...            # optional, comma-separated
```

The frontend packages read no env vars — they proxy to the backend in dev and call same-origin `/api` in production.

## Debugging

- Backend logs to the terminal via `console`/morgan (`morgan('dev')` in development only).
- MongoDB connection (`config/database.ts`) has a 3-layer fallback: SRV → Node DNS → nslookup. The server still starts if the DB is unreachable.
- WebSocket connects at `/ws` (proxied by the customer frontend); logs on client connect.
- Health check: `GET /api/health`.
