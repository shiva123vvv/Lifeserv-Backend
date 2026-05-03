const asyncHandler = require('express-async-handler');
const { Admin, User, Provider, JobRequest, Withdrawal, PayoutMethod, sequelize } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

/**
 * 👑 ADMIN CONTROLLER
 */

// @desc    Admin Login
// @route   POST /api/v1/admin/login
const adminLogin = async (req, res) => {
    try {
        console.log("🔥 LOGIN HIT");
        console.log("📥 BODY:", req.body);

        const { email, password } = req.body;

        if (!email || !password) {
            console.log("❌ Missing fields");
            return res.status(400).json({ success: false, message: "Email and password required" });
        }

        const admin = await Admin.findOne({ where: { email } });

        console.log("👤 Admin Query Result:", admin ? "FOUND" : "NOT FOUND");
        if (admin) {
            console.log("👤 Admin Data:", { id: admin.id, email: admin.email, hasPassword: !!admin.password });
        }

        if (!admin) {
            console.log("❌ Admin not found in database");
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        if (!admin.password) {
            console.log("❌ Admin password field is NULL or EMPTY in DB");
            return res.status(500).json({ success: false, message: "Admin password corrupted" });
        }

        let isMatch = false;

        try {
            console.log("🔐 Starting password comparison...");
            if (admin.password.startsWith("$2")) {
                console.log("🔎 Detected bcrypt hash, comparing...");
                isMatch = await bcrypt.compare(password, admin.password);
            } else {
                console.log("🔎 Detected plain-text password, comparing...");
                isMatch = password === admin.password;
            }
        } catch (err) {
            console.log("❌ Password comparison error:", err.message);
            return res.status(500).json({ success: false, message: "Password comparison failed", error: err.message });
        }

        console.log("🔐 Password match result:", isMatch);

        if (!isMatch) {
            console.log("❌ Password mismatch for admin");
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        if (!process.env.JWT_SECRET) {
            console.log("❌ CRITICAL: JWT_SECRET missing in process.env");
            return res.status(500).json({ success: false, message: "JWT not configured" });
        }

        console.log("🎫 Generating JWT...");
        const token = jwt.sign(
            { id: admin.id, role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        console.log("✅ LOGIN SUCCESS");

        return res.status(200).json({
            success: true,
            token,
            admin: {
                id: admin.id,
                email: admin.email
            }
        });

    } catch (error) {
        console.log("🔥 FINAL CRASH IN adminLogin:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
            stack: error.stack
        });
    }
};

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
