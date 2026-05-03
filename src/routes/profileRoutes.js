const express = require('express');
const router = express.Router();
const { updateFullProfile } = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

router.put('/update', protect, updateFullProfile);

module.exports = router;
