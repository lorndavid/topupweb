import { Router } from 'express';
import { getCategories, getProductsByGame } from '../controllers/category.controller';
import { createPayment, getPaymentStatus, handleCallback } from '../controllers/payment.controller';
import { createOrder, getOrder } from '../controllers/order.controller';

const router = Router();

// Categories & Products
router.get('/categories', getCategories);
router.get('/products/:gameCode', getProductsByGame);

// Payment
router.post('/payment/create', createPayment);
router.get('/payment/status/:reference', getPaymentStatus);
router.post('/payment/callback', handleCallback);

// Orders
router.post('/order', createOrder);
router.get('/order/:reference', getOrder);

export default router;
