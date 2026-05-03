const express = require('express');
const router = express.Router();
const { 
    adminLogin, 
    getDashboardStats, 
    getAllUsers, 
    getAllWithdrawals, 
    updateWithdrawalStatus,
    getPlatformEarnings 
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');

// Middleware to ensure the user is an admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Admin access required' });
    }
};

// Public Admin Routes
router.post('/login', adminLogin);

// Protected Admin Routes
router.use(protect);
router.use(isAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/withdrawals', getAllWithdrawals);
router.patch('/withdrawals/:id', updateWithdrawalStatus);
router.get('/earnings', getPlatformEarnings);

module.exports = router;
