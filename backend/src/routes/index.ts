import { Router } from 'express';
import { getCategories, getCambodiaGames, getProductsByGame } from '../controllers/category.controller';
import { createPayment, getPaymentStatus, handleCallback } from '../controllers/payment.controller';
import { createOrder, getOrder, cancelOrder, retryOrder } from '../controllers/order.controller';
import { verifyPlayer, checkGameId } from '../controllers/player.controller';
import { getAdminDashboard } from '../controllers/admin.controller';
import { getBalance } from '../controllers/balance.controller';
import { receiveStockAlert, getRecentAlerts, testNotification } from '../controllers/webhook.controller';

const router = Router();

// Categories & Products
router.get('/categories', getCategories);
router.get('/cambodia-games', getCambodiaGames);
router.get('/products/:gameCode', getProductsByGame);

// Player Verification
router.post('/verify-player', verifyPlayer);
router.get('/check-id', checkGameId);

// Payment
router.post('/payment/create', createPayment);
router.get('/payment/status/:reference', getPaymentStatus);
router.post('/payment/callback', handleCallback);

// Balance check (for customers to see if shop has stock before paying)
router.get('/balance', getBalance);

// Orders
router.post('/order', createOrder);
router.get('/order/:reference', getOrder);
router.post('/order/:reference/cancel', cancelOrder);
router.post('/order/:reference/retry', retryOrder);

// Webhook (receiver for local stock alerts)
router.post('/webhook/stock-alert', receiveStockAlert);
router.get('/webhook/recent-alerts', getRecentAlerts);
router.post('/webhook/test', testNotification);

// Admin
router.get('/admin/dashboard', getAdminDashboard);

export default router;
