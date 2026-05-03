const express = require('express');
const router = express.Router();
const { User, Provider, Booking, Service } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { sequelize } = require('../config/db');

// Protect all admin routes
router.use(protect);
router.use(authorize('admin'));

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const userCount = await User.count({ where: { role: 'customer' } });
        const providerCount = await User.count({ where: { role: 'provider' } });
        const bookingCount = await Booking.count();

        // Calculate revenue (sum of completed bookings price)
        const revenueResult = await Booking.findAll({
            where: { status: 'completed' },
            attributes: [
                [sequelize.fn('sum', sequelize.col('price')), 'totalRevenue']
            ],
            raw: true
        });

        const revenue = revenueResult[0]?.totalRevenue || 0;

        // Get pending verifications count
        const pendingVerifications = await Provider.count({
            where: { verificationStatus: 'pending' }
        });

        // Get recent bookings
        const recentBookings = await Booking.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'customer',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: Service,
                    attributes: ['id', 'name']
                }
            ]
        });

        res.json({
            users: userCount,
            providers: providerCount,
            bookings: bookingCount,
            revenue: parseFloat(revenue),
            pendingVerifications,
            recentBookings
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get all users
// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const { role, status, search } = req.query;

        let whereClause = {};

        if (role) {
            whereClause.role = role;
        }

        if (status === 'active') {
            whereClause.isActive = true;
        } else if (status === 'inactive') {
            whereClause.isActive = false;
        }

        if (search) {
            whereClause[sequelize.Op.or] = [
                { name: { [sequelize.Op.iLike]: `%${search}%` } },
                { email: { [sequelize.Op.iLike]: `%${search}%` } },
                { phone: { [sequelize.Op.iLike]: `%${search}%` } }
            ];
        }

        const users = await User.findAll({
            where: whereClause,
            attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpire'] },
            order: [['createdAt', 'DESC']]
        });

        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpire'] }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
router.put('/users/:id/status', async (req, res) => {
    try {
        const { isActive, isVerified } = req.body;
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (typeof isActive !== 'undefined') {
            user.isActive = isActive;
        }

        if (typeof isVerified !== 'undefined') {
            user.isVerified = isVerified;
        }

        await user.save();

        res.json({ message: 'User status updated successfully', user });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get all providers with details
// @route   GET /api/admin/providers
router.get('/providers', async (req, res) => {
    try {
        const { verificationStatus, search } = req.query;

        let whereClause = {};

        if (verificationStatus) {
            whereClause.verificationStatus = verificationStatus;
        }

        const providers = await Provider.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'photo', 'isActive', 'isVerified'],
                    where: search ? {
                        [sequelize.Op.or]: [
                            { name: { [sequelize.Op.iLike]: `%${search}%` } },
                            { email: { [sequelize.Op.iLike]: `%${search}%` } }
                        ]
                    } : undefined
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(providers);
    } catch (error) {
        console.error('Get providers error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get provider by ID with full details
// @route   GET /api/admin/providers/:id
router.get('/providers/:id', async (req, res) => {
    try {
        const provider = await Provider.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpire'] }
                }
            ]
        });

        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        res.json(provider);
    } catch (error) {
        console.error('Get provider error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Update provider verification status
// @route   PUT /api/admin/providers/:id/verify
router.put('/providers/:id/verify', async (req, res) => {
    try {
        const { verificationStatus, rejectionReason } = req.body;

        if (!['pending', 'approved', 'rejected'].includes(verificationStatus)) {
            return res.status(400).json({ message: 'Invalid verification status' });
        }

        const provider = await Provider.findByPk(req.params.id);

        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        provider.verificationStatus = verificationStatus;
        provider.isVerified = verificationStatus === 'approved';

        if (verificationStatus === 'rejected' && rejectionReason) {
            provider.rejectionReason = rejectionReason;
        } else {
            provider.rejectionReason = null;
        }

        await provider.save();

        res.json({ message: 'Provider verification status updated', provider });
    } catch (error) {
        console.error('Verify provider error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Update document verification
// @route   PUT /api/admin/providers/:id/documents/:docIndex/verify
router.put('/providers/:id/documents/:docIndex/verify', async (req, res) => {
    try {
        const { isVerified } = req.body;
        const provider = await Provider.findByPk(req.params.id);

        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        const docIndex = parseInt(req.params.docIndex);

        if (!provider.documents || !provider.documents[docIndex]) {
            return res.status(404).json({ message: 'Document not found' });
        }

        provider.documents[docIndex].isVerified = isVerified;
        provider.changed('documents', true);
        await provider.save();

        res.json({ message: 'Document verification updated', provider });
    } catch (error) {
        console.error('Verify document error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get all bookings
// @route   GET /api/admin/bookings
router.get('/bookings', async (req, res) => {
    try {
        const { status } = req.query;

        let whereClause = {};
        if (status) {
            whereClause.status = status;
        }

        const bookings = await Booking.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'customer',
                    attributes: ['id', 'name', 'email', 'phone']
                },
                {
                    model: User,
                    as: 'provider',
                    attributes: ['id', 'name', 'email', 'phone']
                },
                {
                    model: Service,
                    attributes: ['id', 'name', 'category']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(bookings);
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get pending verifications
// @route   GET /api/admin/verifications/pending
router.get('/verifications/pending', async (req, res) => {
    try {
        const pendingProviders = await Provider.findAll({
            where: { verificationStatus: 'pending' },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'photo']
                }
            ],
            order: [['createdAt', 'ASC']]
        });

        res.json(pendingProviders);
    } catch (error) {
        console.error('Get pending verifications error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

module.exports = router;
