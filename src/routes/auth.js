const express = require('express');
const router = express.Router();
const { googleLogin, getMe, deleteMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const { validate } = require('../middleware/validate');

router.post('/google', validate('googleLogin'), googleLogin);
router.get('/me', protect, getMe);
router.delete('/me', protect, deleteMe);

module.exports = router;

