const express = require('express');
const router = express.Router();
const { getCustomerProfile, updateCustomerProfile } = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

const { validate } = require('../middleware/validate');

router.get('/profile', protect, authorize('customer'), getCustomerProfile);
router.put('/profile', protect, authorize('customer'), validate('updateProfile'), updateCustomerProfile);

module.exports = router;
