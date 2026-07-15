# GameTopUp — KHQR Payment + Bay2Game Top-Up System

A complete game top-up website for Cambodia. Customers browse games, pay via **KHQR** (scan with any Cambodian banking app), and get their in-game items delivered automatically through **Bay2Game Reseller API**.

---

## 📋 Table of Contents

- [System Architecture](#system-architecture)
- [Prerequisites & API Keys](#prerequisites--api-keys)
- [Environment Setup](#environment-setup)
- [Installation](#installation)
- [Complete Payment Flow (Step by Step)](#complete-payment-flow-step-by-step)
- [Admin Manual Confirm (When Bakong API Is Down)](#admin-manual-confirm-when-bakong-api-is-down)
- [How KHQR Generation Works](#how-khqr-generation-works)
- [How Payment Verification Works](#how-payment-verification-works)
- [How Orders Flow to Bay2Game](#how-orders-flow-to-bay2game)
- [Stock Retry System (Awaiting Stock)](#stock-retry-system-awaiting-stock)
- [Notifications (Telegram + Webhook)](#notifications-telegram--webhook)
- [API Endpoints Reference](#api-endpoints-reference)
- [Troubleshooting](#troubleshooting)

---

## System Architecture

```
┌──────────────┐      ┌───────────────────────────────────┐      ┌──────────────┐
│   Customer    │      │      Your Web App (Server)        │      │  Bay2Game    │
│   (Browser)   │      │                                   │      │  (Reseller   │
│               │      │  ┌──────────┐  ┌───────────────┐  │      │    API)      │
│  Scans QR     │─────▶│  │ Frontend │──│   Backend     │  │─────▶│              │
│  with ABA/    │      │  │ (Vue 3)  │  │ (Express +    │  │      │  Processes   │
│  ACLEDA/Wing  │◀─────│  │          │  │  MongoDB)     │  │◀─────│  top-up      │
│               │      │  └──────────┘  └───────┬───────┘  │      │              │
│  Pays via QR  │      │                        │          │      └──────────────┘
└───────┬───────┘      │                        │          │
        │              │            ┌────────────▼────────┐ │
        │              │            │  Bakong KHQR SDK +  │ │
        │              │            │  Manual EMVCo QR    │ │
        │              │            │  Fallback           │ │
        │              │            └─────────────────────┘ │
        │              └───────────────────────────────────┘
        │                                │
        ▼                                ▼
┌──────────────────┐         ┌──────────────────────┐
│   Your Bank App  │         │  Bakong API (NBC)    │
│  (ABA, ACLEDA,   │         │  (payment status     │
│   Wing, Bakong)  │         │   verification)      │
│                  │         │                      │
│  Money goes to   │         │  Optional: auto-     │
│  your merchant   │         │  detect when user    │
│  account         │         │  pays via callback   │
└──────────────────┘         └──────────────────────┘
```

### Key External Services

| Service | Purpose | Required? |
|---------|---------|-----------|
| **Bay2Game API** (`api.bay2game.xyz`) | Fetches games/products, validates player IDs, processes top-up orders | ✅ **Required** |
| **Bakong KHQR Library** (`bakong-khqr` npm) | Generates EMVCo-compliant KHQR strings scannable by all Cambodian banks | ✅ Built-in (no API key needed) |
| **Bakong API** (`api-bakong.nbc.gov.kh`) | Real-time payment status checking & callback webhooks | ❌ Optional |
| **MongoDB** | Stores orders, game cache | ✅ **Required** |
| **Telegram Bot** | Sends stock alerts to admin | ❌ Optional |
| **Notification Webhook** | Custom webhook for order events | ❌ Optional |

---

## Prerequisites & API Keys

### 1. Bay2Game API Key (REQUIRED)

This is the core of the system. You need a Bay2Game reseller account:

1. Open Telegram and start [@Bay2GameBot](https://t.me/Bay2GameBot)
2. Send `/start` to create your account (auto-created)
3. Send `/profile` to get your **API Key**
4. Top up your balance via:
   - **USDT** (TRC20, BEP20, Polygon)
   - **KHQR** (all Cambodian banks)
5. Visit [Bay2Game Partner Dashboard](https://bay2game.xyz/partners/login.php) to:
   - View all orders in real-time
   - Export product data to Excel
   - Check funding history & transaction logs
   - Track sales statistics

### 2. Bakong Merchant ID (RECOMMENDED)

Your `MERCHANT_BAKONG_ID` is your Bakong account (e.g. `yourname@bkrt` or `yourname@aclb`). This is used:

- In the KHQR so the money goes to YOUR account when customers scan and pay
- If not set, the KHQR uses `demo@bkrt` (money would go to the demo account!)

### 3. Bakong API Token (OPTIONAL but recommended for auto-verification)

Get this from the National Bank of Cambodia developer portal. With this:
- The system automatically detects when a customer pays (no manual work)
- Payment callbacks can be sent to your server (webhook)

### 4. MongoDB URI (REQUIRED)

The system stores orders, game cache in MongoDB.
- You can use [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier available)
- Or run MongoDB locally

---

## Environment Setup

Create `backend/.env`:

```env
# ─── Server ───────────────────────────────────────
PORT=3001
NODE_ENV=development                          # or "production"
FRONTEND_URL=http://localhost:5173

# ─── MongoDB ──────────────────────────────────────
MONGODB_URI=mongodb+srv://user:pass@cluster.xxxxx.mongodb.net
MONGODB_DB_NAME=gametopup

# ─── Bay2Game (REQUIRED) ─────────────────────────
BAY2GAME_API_URL=https://api.bay2game.xyz
BAY2GAME_API_KEY=your_api_key_here             # Get from @Bay2GameBot

# ─── Merchant Info (RECOMMENDED) ─────────────────
MERCHANT_BAKONG_ID=yourname@bkrt               # Your Bakong account ID
MERCHANT_NAME=GameTopUp Store                  # Displayed on KHQR
MERCHANT_CITY=Phnom Penh

# ─── Bakong API (OPTIONAL, for auto-verify) ──────
BAKONG_API_URL=https://api-bakong.nbc.gov.kh
BAKONG_API_TOKEN=your_bakong_api_token          # For auto payment detection
BAKONG_CALLBACK_URL=https://yourdomain.com/api/payment/callback

# ─── Notifications (OPTIONAL) ────────────────────
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
NOTIFICATION_WEBHOOK_URL=https://your-server.com/webhook
```

---

## Installation

```bash
# Backend
cd backend
npm install
npm run dev              # Starts at http://localhost:3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev              # Starts at http://localhost:5173
```

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
                    (real-time)         │                        │     failed)
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

**Step 1: Customer visits your website**
- Goes to `http://localhost:5173`
- Sees featured games (MLBB, Free Fire, PUBG, Honor of Kings) + all Bay2Game games
- Can search games by name

**Step 2: Customer selects a game**
- Clicks on a game → navigates to `/game/:gameCode`
- Sees game details + product packages with prices in USD
- Enters their Player ID (and Server ID if required)
- Clicks **Verify Player** → backend calls Bay2Game Check API (`/api/game_user_info`) → returns player nickname
- Selects a product package → clicks **Proceed to Checkout**

**Step 3: Checkout + KHQR Generation**
- Enters `GameDetail.vue` → `Checkout.vue`
- Sees order summary (game, package, player ID, total)
- Clicks **Checkout with KHQR** → backend:
  1. Calls `bakongService.generateKHQR()`:
     - **Try 1:** Bakong API (`POST /v1/generate_qr`)
     - **Try 2:** `bakong-khqr` npm SDK (official NBC library)
     - **Try 3:** Manual EMVCo TLV builder (self-generated, guarantees a valid QR)
  2. Stores order in MongoDB with status `awaiting_payment`
  3. Returns KHQR image to frontend

**Step 4: Customer scans and pays**
- Opens their banking app (ABA, ACLEDA, Wing, Bakong, Sathapana, etc.)
- Scans the QR code that appears on screen
- Sees: merchant name, amount in KHR, payment details
- Confirms payment in their bank app

**Step 5: Payment Detection (Auto)**

The frontend polls `GET /api/payment/status/:reference` every **3 seconds**:

```
 ┌──────────────────────────────────────────────────────────┐
 │  Poll every 3s                                           │
 │                                                          │
 │  ┌──────────────┐     ┌────────────────┐                 │
 │  │ Check Bakong  │────▶│  Bakong says    │── PAID ──▶ Mark paid + top-up
 │  │ API           │     │  "PAID"         │                 │
 │  │ (if token)    │     └────────────────┘                 │
 │  └──────────────┘                                        ▼
 │                                              ┌──────────────────┐
 │  ┌──────────────┐     ┌────────────────┐     │ ProcessTopUp()   │
 │  │ Dev Mode:     │────▶│ 30s elapsed?    │───▶│ bay2gameService  │
 │  │ (no Bakong   │     │ Simulate PAID   │     │ .createOrder()   │
 │  │  token)       │     └────────────────┘     └────────┬─────────┘
 │  └──────────────┘                                      │
 │                                                    ┌───▼────┐
 │  ┌──────────────┐     ┌────────────────┐            │ Bay2Game│
 │  │ 5 min timeout │────▶│ Auto-fail if  │            │ creates │
 │  │               │     │ no payment    │            │ order   │
 │  └──────────────┘     └────────────────┘            └────────┘
 └──────────────────────────────────────────────────────────┘
```

**Step 6: Top-Up Processing**

Once payment is detected (auto or manual):

```
Payment Confirmed
       │
       ▼
┌──────────────────┐
│ markPaid()       │
│ order_status =   │
│ 'paid'           │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     SUCCESS     ┌──────────────────┐
│ processTopUp()   │───────────────▶│ markCompleted()   │
│                  │                │ order_status =    │
│ Calls Bay2Game   │                │ 'completed'       │
│ /api/create_order│                └──────────────────┘
│ with reference   │
└────────┬─────────┘
         │
         │ INSUFFICIENT_BALANCE
         ▼
┌──────────────────┐
│ markAwaitingStock│
│                  │
│ Telegram alert   │
│ Webhook alert    │
│ Auto-retry every │
│ ~60 seconds      │
└──────────────────┘
```

---

## Admin Manual Confirm (When Bakong API Is Down)

This is the **fallback mechanism** when Bakong auto-verification doesn't work.

### Why This Exists

Without a `BAKONG_API_TOKEN`, the system cannot automatically detect when a customer pays. The dev mode simulation (30s auto-pay) only works in `NODE_ENV=development`.

### How to Use

When a customer says "I've paid" but the system still shows "Pending":

1. **Wait 30 seconds** after the checkout (the button takes 30s to appear — prevents accidental clicks)
2. **Check your bank app** — verify the money has actually arrived in your account
3. **Click the green button:**

```
 ┌────────────────────────────────────────────────────┐
 │  🛡️  Payment received but not detected?            │
 │                                                    │
 │  If you scanned and paid, confirm manually to      │
 │  process the top-up immediately.                   │
 │                                                    │
 │  ┌────────────────────────────────────────────┐    │
 │  │   I've Paid — Confirm & Process            │    │
 │  └────────────────────────────────────────────┘    │
 └────────────────────────────────────────────────────┘
```

4. **Confirm the dialog** (it warns you to verify the payment first)
5. System marks the order as paid and immediately sends the top-up to Bay2Game
6. The order now appears in Bay2Game Partner Dashboard

### When to Use It

| Scenario | Use Manual Confirm? |
|----------|-------------------|
| `BAKONG_API_TOKEN` is set and working | ❌ No — system auto-detects |
| `BAKONG_API_TOKEN` is not set | ✅ Yes — 30s after checkout |
| Bakong API is down temporarily | ✅ Yes |
| Customer paid but you're unsure | ❌ No — check your bank first |
| Customer claims to have paid but no money received | ❌ No — never confirm without verifying |

### ⚠️ Important

**Only confirm after verifying the money is in your bank account.** Manual confirmation directly triggers the top-up via Bay2Game, which deducts from your Bay2Game balance. If you confirm without receiving payment, you lose money.

---

## How KHQR Generation Works

### Three-Layer Fallback Strategy

The system tries 3 approaches in order:

```
generateKHQR()
    │
    ├── 1. Bakong API (if credentials configured)
    │     POST /v1/generate_qr
    │     Requires: BAKONG_API_TOKEN + MERCHANT_BAKONG_ID
    │     Returns: Proper KHQR from NBC's own API
    │     Most authoritative — used in production
    │
    ├── 2. bakong-khqr npm SDK (official NBC library)
    │     Uses: BakongKHQR.generateIndividual()
    │     Requires: MERCHANT_BAKONG_ID
    │     Generates: EMVCo-compliant KHQR with CRC16-CCITT
    │     All Cambodian banks accept this
    │
    └── 3. Manual EMVCo TLV Builder (last resort fallback)
          Builds KHQR string from scratch:
          Tag   Description           Value
          ───   ───────────           ─────
          00    Payload Format        01
          01    Initiation Method     11 (static)
          29    Merchant Account      ┌ 00: "khqr.bakong.com"
                                      ├ 01: MERCHANT_BAKONG_ID
                                      ├ 02: MERCHANT_NAME
                                      └ 03: MERCHANT_CITY
          53    Currency              116 (KHR)
          54    Amount                amount in KHR
          58    Country Code          KH
          59    Merchant Name         MERCHANT_NAME
          60    Merchant City         MERCHANT_CITY
          62    Additional Data       bill number, store label
          63    CRC16-CCITT           polynomial 0x1021

          This fallback ALWAYS produces a valid KHQR even if
          the NBC SDK fails. Every Cambodian bank will accept it.
```

### What Makes a Valid KHQR

A valid KHQR must:
1. Follow **EMVCo QR Code** standard (Tag-Length-Value structure)
2. Use **Tag 29** for Cambodia-specific merchant account info
3. Include the correct **Bakong account ID** (e.g. `yourname@bkrt`)
4. Have a correct **CRC16-CCITT** checksum (polynomial `0x1021`)
5. Display amount in **KHR** (Riel) — the system converts USD × 4,100

### Why Earlier QRs Were "Invalid"

Before the fallback fix, when both Bakong API and the SDK failed, the system generated `topup://TXN-XXXXX` — a plain text string that no banking app could interpret as a payment QR. **This has been fixed** — the manual EMVCo builder now generates a proper, scannable QR even as a last resort.

---

## How Payment Verification Works

The system uses a **dual approach** to detect when a customer has paid:

### 1. Bakong API (Primary — Auto)

**When configured (`BAKONG_API_TOKEN` is set):**
- Frontend polls `GET /api/payment/status/:reference` every **3 seconds**
- Backend calls Bakong's `POST /v1/check_transaction` with the transaction ID
- If Bakong says "PAID" or "SUCCESS", the order is marked paid and top-up begins
- If Bakong is unreachable in production, the system throws an error (no false positives)

### 2. Dev Mode Simulation

**When `BAKONG_API_TOKEN` is NOT set and `NODE_ENV=development`:**
- After **30 seconds**, the system auto-simulates payment received
- This allows testing the full flow without real payment
- Only works in development mode

### 3. Manual Confirmation (Admin Fallback)

**Works in any mode:**
- Admin clicks "I've Paid — Confirm & Process" button (appears 30s after checkout)
- Backend validates the order is still pending
- Marks as paid and triggers top-up immediately
- No Bakong API needed

### 4. Payment Timeout

- After **5 minutes** without payment detection, the order is auto-cancelled (status = `failed`)
- Customer or admin can regenerate by starting a new checkout

---

## How Orders Flow to Bay2Game

When payment is confirmed (auto or manual):

```
1. Order validated
   ├── payment_status === 'paid'
   └── order exists in MongoDB

2. Bay2Game API called
   GET /api/create_order?api_key=xxx
                      &product_code=MLBB_100
                      &game_user_id=262856740
                      &reference=TUP-ABC123-DEF456
                      &game_zone_id=3543        (optional)

3. Bay2Game processes
   ├── Deducts from your reseller balance
   ├── Credits in-game items to player
   └── Returns order confirmation

4. System updates
   ├── Order marked 'completed' in MongoDB
   └── Fulfillment notification sent (if was awaiting stock)

5. Order visible in Bay2Game Partner Dashboard
   Visit: https://bay2game.xyz/partners/login.php
   Login with your API key
   └── See: all orders, funding history, sales stats
```

### If Bay2Game Balance Is Low

When Bay2Game returns `INSUFFICIENT_BALANCE`:

```
Payment confirmed (money in your bank)
         │
         ▼
processTopUp() calls Bay2Game
         │
         ├── SUCCESS ──▶ Order completed ✅
         │
         └── INSUFFICIENT_BALANCE ──▶ Order enters 'awaiting_stock'
                     │
                     ├── Telegram alert sent to admin
                     ├── Webhook sent to your server
                     └── Auto-retry scheduler starts
                           │
                           ├── Retry 1: after 30s
                           ├── Retry 2: after 60s
                           ├── Retry 3: after 120s
                           ├── ... (exponential backoff, max 1 hour)
                           │
                           └── Failed after 1440 retries (~24 hours)

Admin action needed:
   1. Open @Bay2GameBot on Telegram
   2. Deposit USDT or KHQR to add balance
   3. System auto-retries every ~60 seconds
   4. OR click "Retry Now" manually via admin dashboard
```

---

## Stock Retry System (Awaiting Stock)

When your Bay2Game balance is too low to fulfill an order, the system doesn't give up — it queues the order and keeps trying.

### Automatic Retry

- Runs every **60 seconds** (configurable in `constants/index.ts`)
- Exponential backoff: 30s → 60s → 120s → 240s → ... → max 1 hour
- Max 1,440 retries (~24 hours) before marking as failed
- Each retry checks if balance has been topped up

### Manual Retry

Via API: `POST /api/order/:reference/retry`

```bash
curl -X POST http://localhost:3001/api/order/TUP-ABC123-DEF456/retry
```

This resets the retry count and immediately attempts the top-up.

### Notifications

When an order enters `awaiting_stock`, the system sends alerts via:
- **Telegram** (if `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` configured)
- **Webhook** (if `NOTIFICATION_WEBHOOK_URL` configured)

When the stock is replenished and the order is fulfilled, a "Stock Delivered!" notification is sent.

---

## Notifications (Telegram + Webhook)

### Telegram Setup

1. Create a bot: message [@BotFather](https://t.me/BotFather) → `/newbot` → get token
2. Get your chat ID: message [@userinfobot](https://t.me/userinfobot) → `/start`
3. Set in `.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   TELEGRAM_CHAT_ID=123456789
   ```

### Test Your Notifications

```bash
curl -X POST http://localhost:3001/api/webhook/test
```

This sends a test message to Telegram and/or webhook, and returns detailed results:
```json
{
  "success": true,
  "data": {
    "telegram": { "configured": true, "sent": true },
    "webhook": { "configured": false, "sent": false }
  }
}
```

---

## API Endpoints Reference

### Categories & Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | All Bay2Game games |
| GET | `/api/cambodia-games` | Featured + all games (sorted) |
| GET | `/api/products/:gameCode` | Products for a specific game |

### Player Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verify-player` | Verify player ID via Bay2Game |
| GET | `/api/check-id` | Direct Bay2Game check (query params) |

### Payment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/create` | Create payment + generate KHQR |
| GET | `/api/payment/status/:reference` | Poll payment status |
| POST | `/api/payment/callback` | Bakong webhook callback |
| **POST** | **`/api/payment/manual-confirm/:reference`** | **Admin: manually confirm payment** |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/order` | Create order (after payment) |
| GET | `/api/order/:reference` | Get order details |
| POST | `/api/order/:reference/cancel` | Cancel pending order |
| POST | `/api/order/:reference/retry` | Retry awaiting_stock order |

### Balance & Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/balance` | Check reseller Bay2Game balance |
| GET | `/api/admin/dashboard` | Admin dashboard data |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhook/stock-alert` | Receive external stock alerts |
| GET | `/api/webhook/recent-alerts` | View recent alerts |
| POST | `/api/webhook/test` | Test Telegram + webhook config |

---

## Troubleshooting

### QR Not Scannable by Bank

| Possible Cause | Solution |
|----------------|----------|
| `MERCHANT_BAKONG_ID` not set | Set it to your Bakong account ID (e.g. `yourname@bkrt`) |
| `bakong-khqr` SDK failed | The manual EMVCo fallback should generate a valid QR anyway |
| Amount too large | KHQR has a limit on the amount string length |

### Payment Never Auto-Detected

| Possible Cause | Solution |
|----------------|----------|
| `BAKONG_API_TOKEN` not set | System can't auto-detect → use manual confirm |
| Bakong API down | Use manual confirm button |
| Wrong transaction ID | Check `transaction_id` in MongoDB order document |
| In production | The dev mode 30s simulation only works in development |

### Order Not Appearing in Bay2Game Admin

| Possible Cause | Solution |
|----------------|----------|
| Payment was never confirmed | Check `payment_status` in MongoDB |
| `BAY2GAME_API_KEY` wrong | Verify with `/profile` on @Bay2GameBot |
| Insufficient balance | Add funds to your Bay2Game wallet |
| Manual confirm not used | Click "I've Paid" button after verifying receipt |

### "Insufficient Balance" Errors

1. Open @Bay2GameBot on Telegram
2. Send `/deposit` to add funds (USDT or KHQR)
3. Wait for auto-retry (every ~60 seconds)
4. Or manually retry via `POST /api/order/:reference/retry`

### TypeScript Compilation Errors

```bash
# Backend
cd backend && npx tsc --noEmit

# Frontend
cd frontend && npx vue-tsc --noEmit
```

### Server Won't Start

```bash
# Check for missing env vars
cd backend && npm run dev
# Look for: "⚠️  Missing environment variables: ..."

# Verify MongoDB is running
mongosh --eval "db.runCommand({ ping: 1 })"
```

---

## Project Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── bakong.service.ts       # KHQR generation + Bakong API
│   │   ├── bay2game.service.ts     # Bay2Game API integration
│   │   ├── bay2gameCheck.service.ts # Player ID verification
│   │   ├── order.service.ts        # Order processing + payment flow
│   │   ├── notification.service.ts  # Telegram + webhook alerts
│   │   └── gameLookup.service.ts    # Game ID lookup
│   ├── controllers/                 # Express route handlers
│   ├── repositories/
│   │   └── OrderRepository.ts       # MongoDB operations
│   ├── models/
│   │   └── Order.ts                 # Mongoose schema
│   ├── config/index.ts              # Environment config
│   ├── constants/index.ts           # Status codes, error messages
│   ├── types/                       # TypeScript types
│   └── routes/index.ts              # All API routes
└── package.json

frontend/
├── src/
│   ├── views/
│   │   ├── Home.vue                 # Game listing + search
│   │   ├── GameDetail.vue           # Game detail + player verify
│   │   ├── Checkout.vue             # Checkout + KHQR + manual confirm
│   │   └── OrderStatus.vue          # Order tracking
│   ├── components/
│   │   ├── KHQRCard.vue             # PayWay-style KHQR card
│   │   ├── ProductCard.vue          # Product package card
│   │   └── GameCard.vue             # Game card
│   └── services/api.ts              # API client
└── package.json
```


## Tech Stack

- **Frontend:** Vue 3, Vite, TypeScript, TailwindCSS, Pinia, Vue Router, GSAP
- **Backend:** Node.js, Express, TypeScript, MongoDB (Mongoose), Zod
- **External APIs:** Bay2Game (https://api.bay2game.xyz), Bakong KHQR, Telegram Bot API
