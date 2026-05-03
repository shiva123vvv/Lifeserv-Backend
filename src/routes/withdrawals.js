const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/payout-method', withdrawalController.savePayoutMethod);
router.get('/payout-method', withdrawalController.getPayoutMethod);

router.post('/', withdrawalController.requestWithdrawal);
router.get('/latest', withdrawalController.getLatestWithdrawal);
router.get('/available-balance', withdrawalController.getAvailableBalance);

module.exports = router;
