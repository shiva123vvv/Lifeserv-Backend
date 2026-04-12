const express = require('express');
const router = express.Router();
const { createReview, getProviderReviews, getReviewByBooking } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createReview);
router.get('/provider/:providerId', getProviderReviews);
router.get('/booking/:bookingId', getReviewByBooking);

module.exports = router;
