const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, deleteMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.delete('/me', protect, deleteMe);

module.exports = router;
