const express = require('express');
const router = express.Router();
const { getServices, createService, deleteService, getCategories } = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/auth');

router.get('/categories', getCategories);
router.get('/', getServices);
router.post('/', protect, authorize('admin'), createService);
router.delete('/:id', protect, authorize('admin'), deleteService);

module.exports = router;
