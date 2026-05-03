const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    createJobRequest,
    respondToJobRequest,
    acceptJobRequest,
    rejectJobRequest,
    markJobAsPaid,
    getProviderJobRequests,
    getCustomerJobRequests,
    completeJobRequest
} = require('../controllers/jobRequestController');

router.use(protect);

router.post('/', createJobRequest);
router.get('/provider', getProviderJobRequests);
router.get('/customer', getCustomerJobRequests);
router.patch('/:id/respond', respondToJobRequest);
router.patch('/:id/accept', acceptJobRequest);
router.patch('/:id/reject', rejectJobRequest);
router.patch('/:id/complete', completeJobRequest);

module.exports = router;
