const express = require('express');
const router = express.Router();
const { createBooking, getBookings, updateBookingPayment } = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

const { validate } = require('../middleware/validate');

router.post('/', protect, authorize('customer'), validate('createBooking'), createBooking);
router.get('/', protect, getBookings);
router.put('/:id/pay', protect, updateBookingPayment);

module.exports = router;
