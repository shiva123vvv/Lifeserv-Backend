const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createOrder, verifyPayment, confirmPayment, handleWebhook } = require('../controllers/paymentController');

router.post('/webhook', handleWebhook); // Unprotected for gateway access

router.use(protect);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.post('/confirm', confirmPayment);

module.exports = router;
