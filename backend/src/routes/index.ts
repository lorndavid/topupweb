import { Router } from 'express';
import { getCategories, getCambodiaGames, getProductsByGame, getPriceDropsByGame } from '../controllers/category.controller';
import { createPayment, getPaymentStatus, handleCallback, manualConfirmPayment } from '../controllers/payment.controller';
import { createOrder, getOrder, getOrdersByPlayer, cancelOrder, retryOrder } from '../controllers/order.controller';
import { verifyPlayer, checkGameId } from '../controllers/player.controller';
import { getAdminDashboard } from '../controllers/admin.controller';
import { getBalance } from '../controllers/balance.controller';
import { receiveStockAlert, getRecentAlerts, triggerDailySummary, testNotification } from '../controllers/webhook.controller';
import { config } from '../config';
import { pushNotificationService } from '../services/pushNotification.service';

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
router.post('/payment/manual-confirm/:reference', manualConfirmPayment);

// Balance check (for customers to see if shop has stock before paying)
router.get('/balance', getBalance);

// Orders
router.post('/order', createOrder);
router.get('/order/:reference', getOrder);
router.get('/orders/player/:playerId', getOrdersByPlayer);
router.post('/order/:reference/cancel', cancelOrder);
router.post('/order/:reference/retry', retryOrder);

// Webhook (receiver for local stock alerts)
router.post('/webhook/stock-alert', receiveStockAlert);
router.get('/webhook/recent-alerts', getRecentAlerts);
router.post('/webhook/test', testNotification);
router.post('/webhook/daily-summary', triggerDailySummary);

// Push notifications
router.post('/push/subscribe', (req, res) => {
  const { endpoint, keys, userAgent } = req.body;
  if (!endpoint || !keys?.auth || !keys?.p256dh) {
    return res.status(400).json({ success: false, message: 'Invalid subscription object' });
  }
  const result = pushNotificationService.subscribe({ endpoint, keys, userAgent, createdAt: new Date() });
  res.json({ success: true, message: result.message });
});

router.post('/push/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ success: false, message: 'Endpoint required' });
  }
  const result = pushNotificationService.unsubscribe(endpoint);
  res.json({ success: true, message: result.message });
});

router.get('/push/stats', (_req, res) => {
  const stats = pushNotificationService.getStats();
  res.json({ success: true, data: stats });
});

router.get('/push/vapid-key', (_req, res) => {
  res.json({
    success: true,
    data: { publicKey: config.push.publicKey },
  });
});

// Price drops
router.get('/price-drops/:gameCode', getPriceDropsByGame);

// Config
router.get('/config/new-products', (_req, res) => {
  res.json({
    success: true,
    message: 'New products config fetched',
    data: {
      mlbb: [11, 22, 55, 112],          // Newly added MLBB diamond packages
      freefire_sgmy: [],
      freefire_global: [],
      pubgm: [],
    },
  });
});

// Admin
router.get('/admin/dashboard', getAdminDashboard);

export default router;
