# GameTopUp - Local MVP Game Top-Up Website

A complete local development prototype for a game top-up website built with Vue 3, Vite, TypeScript, TailwindCSS, Pinia, and Vue Router on the frontend, and Node.js, Express, and TypeScript on the backend.

## Features

- **204+ Games** - Support for popular games including Mobile Legends, Free Fire, PUBG Mobile, Blood Strike
- **Bakong KHQR Payment** - Cambodian QR payment integration
- **Bay2Game Integration** - Reseller API for automated game top-up delivery
- **Dark Mode** - Full dark mode support with system preference detection
- **Responsive Design** - Mobile-friendly UI inspired by Codashop
- **Real-time Status** - Payment polling and order status tracking

## Project Structure

```
project/
├── backend/
│   ├── src/
│   │   ├── config/         # Environment config
│   │   ├── controllers/    # Route handlers
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic (Bay2Game, Bakong, Order)
│   │   ├── middleware/     # Error handling
│   │   ├── utils/          # Utilities
│   │   ├── types/          # TypeScript types
│   │   ├── interfaces/     # TypeScript interfaces
│   │   ├── constants/      # Constants & status codes
│   │   ├── validators/     # Request validation (Zod)
│   │   ├── app.ts          # Express app setup
│   │   └── server.ts       # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components (Navbar, Footer, GameCard, etc.)
│   │   ├── views/          # Page components (Home, GameDetail, Checkout, etc.)
│   │   ├── stores/         # Pinia stores (game, toast)
│   │   ├── services/       # API service layer
│   │   ├── types/          # TypeScript types
│   │   ├── router/         # Vue Router config
│   │   ├── App.vue         # Root component
│   │   └── main.ts         # Entry point
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Prerequisites

- **Node.js** version 18 or higher
- **npm** version 9 or higher
- **Bay2Game API Key** (required for real top-ups) - Get it from [@Bay2GameBot](https://t.me/Bay2GameBot) using `/profile` command
- **Bakong Merchant Account** (required for real payments)

## Installation

### 1. Clone the repository

```bash
cd game-topup
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure backend environment

```bash
cp .env.example .env
```

Edit `.env` with your actual API keys:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

BAY2GAME_API_URL=https://api.bay2game.xyz
BAY2GAME_API_KEY=your_actual_api_key_here

BAKONG_API_URL=https://api-bakong.nbc.gov.kh
BAKONG_API_KEY=your_bakong_api_key_here
BAKONG_ACCOUNT_ID=your_bakong_account_id_here
BAKONG_MERCHANT_ID=your_bakong_merchant_id_here
BAKONG_CALLBACK_URL=http://localhost:3001/api/payment/callback
BAKONG_RETURN_URL=http://localhost:5173/payment/success
```

### 4. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 5. Start both servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Server starts at http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Server starts at http://localhost:5173

## API Endpoints

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Get All Categories
```bash
curl http://localhost:3001/api/categories
```

### Get Products by Game
```bash
curl http://localhost:3001/api/products/mlbb_exclusive
```

### Create Payment Request
```bash
curl -X POST http://localhost:3001/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "game_code": "mlbb_exclusive",
    "product_code": "MLBB_100",
    "product_name": "100 Diamonds",
    "game_name": "Mobile Legends Bang Bang",
    "player_id": "262856740",
    "server_id": "3543",
    "amount": 1.5
  }'
```

### Check Payment Status
```bash
curl http://localhost:3001/api/payment/status/TUP-REFERENCE-HERE
```

### Get Order Details
```bash
curl http://localhost:3001/api/order/TUP-REFERENCE-HERE
```

### Create Order (After Payment)
```bash
curl -X POST http://localhost:3001/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "TUP-REFERENCE-HERE",
    "game_code": "mlbb_exclusive",
    "product_code": "MLBB_100",
    "player_id": "262856740",
    "server_id": "3543",
    "amount": 1.5
  }'
```

## Workflow

1. **Home** → Browse available games
2. **Game Detail** → Select game → Choose package → Enter Player ID/Server
3. **Checkout** → Review order summary
4. **Payment** → Scan KHQR code → Pay with Bakong app
5. **Auto-confirm** → Payment status polled (simulated: auto-paid after 15s)
6. **Order Status** → Top-up processed via Bay2Game API

## Testing Instructions (Localhost)

Since this is a local development project:

1. **No real payment required** - The backend simulates payment confirmation after 15 seconds
2. **No Bay2Game API key needed** for UI testing - The app will show UI but backend calls will fail without API keys
3. **Full workflow test**: Browse games → Select package → Enter Player ID → See KHQR → Wait for auto-confirmation → See order status

### Test without API keys:

The app will function for UI testing. When you reach the payment page:
- A simulated KHQR code is displayed
- After 15 seconds, the system auto-confirms payment (simulated)
- The order will attempt to process via Bay2Game (will fail without API key)
- You'll see the order status page

## Known Limitations

1. **Localhost Only** - Not configured for production deployment
2. **In-Memory Storage** - Orders are stored in memory and lost on server restart
3. **Simulated Payments** - KHQR generates simulated QR codes (real Bakong API optional)
4. **No Authentication** - No user accounts, sessions, or authentication
5. **No Admin Panel** - No dashboard for managing orders or products
6. **Single Currency** - USD-only pricing (KHR conversion shown for display)
7. **No Email Notifications** - No order confirmation emails
8. **No WebSocket** - Payment status uses polling instead of WebSocket

## Future Improvements

- [ ] Database integration (PostgreSQL/MySQL)
- [ ] User authentication and accounts
- [ ] Admin dashboard for order management
- [ ] Real-time updates via WebSocket
- [ ] Multiple payment methods (ABA Pay, Wing, ACLEDA)
- [ ] Email/SMS notifications
- [ ] Transaction history
- [ ] Promotional codes and discounts
- [ ] Multi-currency support
- [ ] Order history and favorites
- [ ] Live chat support
- [ ] Rate limiting and caching
- [ ] Unit and integration tests
- [ ] Docker setup for easy deployment
- [ ] SSL/TLS for production

## Tech Stack

### Frontend
- [Vue 3](https://vuejs.org/) - Progressive JavaScript framework
- [Vite](https://vitejs.dev/) - Build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS
- [Pinia](https://pinia.vuejs.org/) - State management
- [Vue Router](https://router.vuejs.org/) - Routing
- [Axios](https://axios-http.com/) - HTTP client

### Backend
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Express](https://expressjs.com/) - Web framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Zod](https://zod.dev/) - Schema validation
- [Axios](https://axios-http.com/) - HTTP client
- [Helmet](https://helmetjs.github.io/) - Security headers
- [Morgan](https://github.com/expressjs/morgan) - HTTP logger

### External APIs
- [Bay2Game Reseller API](https://api.bay2game.xyz) - Game top-up services (204+ games)
- [Bakong Merchant API](https://api-bakong.nbc.gov.kh) - Cambodian payment gateway

## License

MIT
