const express = require('express');
const router = express.Router();
const { createReview, getProviderReviews, getReviewByJobRequest } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createReview);
router.get('/provider/:providerId', getProviderReviews);
router.get('/job-request/:jobRequestId', getReviewByJobRequest);

module.exports = router;
