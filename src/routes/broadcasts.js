const express = require('express');
const router = express.Router();
const {
    createBroadcast,
    getBroadcasts,
    getBroadcastResponses,
    respondToBroadcast,
    getMyResponses,
    getMyBroadcasts,
    updateBroadcast,
    deleteBroadcast
} = require('../controllers/broadcastController');
const { protect } = require('../middleware/auth');

router.use((req, res, next) => {
    console.log(`🔥 [BroadcastRouter] Hit: ${req.method} ${req.url}`);
    next();
});

// ⚠️ IMPORTANT: /my MUST be above /:id
router.get('/my', protect, getMyBroadcasts);
router.get('/my-responses', protect, getMyResponses);

router.post('/', protect, createBroadcast);
router.get('/', protect, getBroadcasts);
router.get('/:id/responses', protect, getBroadcastResponses);
router.post('/respond', protect, respondToBroadcast);
router.put('/:id', protect, updateBroadcast);
router.delete('/:id', protect, deleteBroadcast);

// Router-level 404 for debugging
router.use((req, res) => {
    console.warn(`🔥 [BroadcastRouter 404] No match for: ${req.method} ${req.url}`);
    res.status(404).json({ success: false, message: "Broadcast route not found" });
});

module.exports = router;
