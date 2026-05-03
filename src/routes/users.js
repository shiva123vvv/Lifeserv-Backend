const express = require('express');
const router = express.Router();
const { updatePhone, completeOnboarding, updateProfile, updateAddress } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

// 1. Phone Update
router.patch('/phone', validate('updatePhone'), updatePhone);

// 2. Profile Update
router.patch('/profile', updateProfile);

// 3. Address Update (Onboarding)
router.patch('/address', updateAddress);

// 4. Onboarding Complete
router.patch('/onboarding-complete', completeOnboarding);

// 🔥 TEMP: Debug route
router.get("/test", (req, res) => {
    res.json({ success: true, message: "Users router is active and reachable." });
});

module.exports = router;
