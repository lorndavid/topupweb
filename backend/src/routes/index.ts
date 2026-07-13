import { Router } from 'express';
import { getCategories, getProductsByGame } from '../controllers/category.controller';
import { createPayment, getPaymentStatus, handleCallback } from '../controllers/payment.controller';
import { createOrder, getOrder, cancelOrder } from '../controllers/order.controller';
import { verifyPlayer } from '../controllers/player.controller';

const router = Router();

// Categories & Products
router.get('/categories', getCategories);
router.get('/products/:gameCode', getProductsByGame);

// Player Verification
router.post('/verify-player', verifyPlayer);

// Payment
router.post('/payment/create', createPayment);
router.get('/payment/status/:reference', getPaymentStatus);
router.post('/payment/callback', handleCallback);

// Orders
router.post('/order', createOrder);
router.get('/order/:reference', getOrder);
router.post('/order/:reference/cancel', cancelOrder);

export default router;
