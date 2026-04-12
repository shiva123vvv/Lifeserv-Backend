const express = require('express');
const router = express.Router();
const {
    createJobOffer,
    getJobOffers,
    getMyJobOffers
} = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('customer'), createJobOffer);
router.get('/', getJobOffers);
router.get('/my', protect, authorize('customer'), getMyJobOffers);

module.exports = router;
