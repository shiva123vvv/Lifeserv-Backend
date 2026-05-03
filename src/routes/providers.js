const express = require('express');
const router = express.Router();
const {
    getProviderProfile,
    updateProviderProfile,
    getProviders,
    updateJobStatus,
    getProviderEarnings,
    getProviderById
} = require('../controllers/providerController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getProviders);
router.get('/profile', protect, authorize('provider'), getProviderProfile);
const { validate } = require('../middleware/validate');

router.put('/profile', protect, authorize('provider'), validate('updateProfile'), updateProviderProfile);
router.get('/earnings', protect, authorize('provider'), getProviderEarnings);
router.put('/jobs/:id/:action', protect, authorize('provider'), updateJobStatus);
router.get('/:id', getProviderById);

module.exports = router;
