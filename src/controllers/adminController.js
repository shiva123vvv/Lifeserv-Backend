const asyncHandler = require('express-async-handler');
const { Admin, User, Provider, JobRequest, Withdrawal, PayoutMethod, sequelize } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

/**
 * 👑 ADMIN CONTROLLER
 */

// @desc    Admin Login
// @route   POST /api/v1/admin/login
const adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    console.log(`📥 Login attempt for: ${email}`);

    // 1. Validate Input
    if (!email || !password) {
        res.status(400);
        throw new Error('Please provide both email and password');
    }

    // 2. Find Admin
    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
        console.warn(`⚠️ Admin not found: ${email}`);
        res.status(401);
        throw new Error('Invalid email or password');
    }

    // 3. Verify Password
    let isMatch = false;
    try {
        isMatch = await admin.matchPassword(password);
    } catch (pwError) {
        console.error(`❌ Password comparison failed for ${email}:`, pwError.message);
        res.status(500);
        throw new Error('Authentication process failed. Please contact support.');
    }

    if (!isMatch) {
        console.warn(`❌ Password mismatch for: ${email}`);
        res.status(401);
        throw new Error('Invalid email or password');
    }

    // 4. Validate JWT Secret
    if (!process.env.JWT_SECRET) {
        console.error('🚨 CRITICAL: JWT_SECRET is missing in environment variables');
        res.status(500);
        throw new Error('Server configuration error');
    }

    // 5. Generate Token
    const token = jwt.sign(
        { id: admin.id, role: 'admin' }, 
        process.env.JWT_SECRET, 
        { expiresIn: '30d' }
    );

    console.log(`✅ Admin logged in: ${email}`);
    
    res.json({
        success: true,
        token,
        admin: { 
            id: admin.id, 
            email: admin.email, 
            role: admin.role 
        }
    });
});

// @desc    Get Dashboard Stats
// @route   GET /api/v1/admin/dashboard
const getDashboardStats = asyncHandler(async (req, res) => {
    const totalUsers = await User.count({ where: { role: 'customer' } });
    const totalProviders = await Provider.count();
    
    const totalEarnings = await JobRequest.sum('price', { where: { paymentStatus: 'paid' } }) || 0;
    const totalWithdrawals = await Withdrawal.sum('amount', { where: { status: 'paid' } }) || 0;
    const pendingWithdrawals = await Withdrawal.count({ where: { status: 'pending' } });

    const recentActivity = await JobRequest.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [{ model: User, as: 'customer', attributes: ['name'] }]
    });

    res.json({
        success: true,
        data: {
            totalUsers,
            totalProviders,
            totalEarnings: parseFloat(totalEarnings),
            totalWithdrawals: parseFloat(totalWithdrawals),
            pendingWithdrawals,
            recentActivity
        }
    });
});

// @desc    Get All Users
// @route   GET /api/v1/admin/users
const getAllUsers = asyncHandler(async (req, res) => {
    const { role, search } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } }
        ];
    }

    const users = await User.findAll({
        where,
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: users });
});

// @desc    Get All Withdrawals
// @route   GET /api/v1/admin/withdrawals
const getAllWithdrawals = asyncHandler(async (req, res) => {
    const withdrawals = await Withdrawal.findAll({
        order: [['createdAt', 'DESC']],
        include: [
            { 
                model: User, 
                as: 'user',
                attributes: ['name', 'email'],
                include: [{ model: PayoutMethod, as: 'payoutMethod' }]
            }
        ]
    });

    res.json({ success: true, data: withdrawals });
});

// @desc    Update Withdrawal Status
// @route   PATCH /api/v1/admin/withdrawals/:id
const updateWithdrawalStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const withdrawal = await Withdrawal.findByPk(req.params.id);

    if (!withdrawal) {
        res.status(404);
        throw new Error('Withdrawal not found');
    }

    if (status === 'failed') {
        // If rejected, refund the balance
        const user = await User.findByPk(withdrawal.userId);
        if (user) {
            user.balance = parseFloat(user.balance) + parseFloat(withdrawal.amount);
            await user.save();
        }
    }

    withdrawal.status = status;
    await withdrawal.save();

    res.json({ success: true, data: withdrawal });
});

// @desc    Get Platform Earnings
// @route   GET /api/v1/admin/earnings
const getPlatformEarnings = asyncHandler(async (req, res) => {
    const earnings = await JobRequest.findAll({
        where: { paymentStatus: 'paid' },
        order: [['createdAt', 'DESC']],
        include: [
            { model: User, as: 'customer', attributes: ['name'] },
            { model: Provider, as: 'provider', include: [{ model: User, as: 'user', attributes: ['name'] }] }
        ]
    });

    res.json({ success: true, data: earnings });
});

module.exports = {
    adminLogin,
    getDashboardStats,
    getAllUsers,
    getAllWithdrawals,
    updateWithdrawalStatus,
    getPlatformEarnings
};
