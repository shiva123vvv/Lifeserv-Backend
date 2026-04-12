const asyncHandler = require('express-async-handler');
const { User, Provider } = require('../models');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user (Phone centric)
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, phone, role } = req.body;
    console.log('[AuthController] Register attempt:', { name, phone, role });

    if (!phone || !name) {
        res.status(400);
        throw new Error('Please provide name and phone number');
    }

    const userExists = await User.findOne({ where: { phone } });
    if (userExists) {
        console.log('[AuthController] User already exists, treating as login:', phone);
        let provider = null;
        if (userExists.role === 'provider') {
            provider = await Provider.findOne({ where: { userId: userExists.id } });
        }
        return res.status(200).json({
            _id: userExists.id,
            name: userExists.name,
            phone: userExists.phone,
            role: userExists.role,
            token: generateToken(userExists.id),
            onboardingComplete: provider ? provider.isVerified : false,
            message: `Identity already exists as a ${userExists.role}. Session restored.`
        });
    }

    // Create user with phone
    const user = await User.create({
        name,
        phone,
        role: role || 'customer',
        isVerified: true // Auto-verify for now as we simulate OTP
    });

    if (user) {
        console.log('[AuthController] User created successfully:', user.id);
        if (user.role === 'provider') {
            await Provider.create({ userId: user.id });
        }

        res.status(201).json({
            _id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            token: generateToken(user.id),
            onboardingComplete: false
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Auth user via phone (Simulated OTP success)
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    console.log('[AuthController] Login attempt for phone:', phone);

    const user = await User.findOne({ where: { phone } });
    let provider = null;

    if (user && user.role === 'provider') {
        provider = await Provider.findOne({ where: { userId: user.id } });
    }

    if (user) {
        console.log('[AuthController] Login successful for user:', user.phone);
        res.json({
            _id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            token: generateToken(user.id),
            onboardingComplete: provider ? provider.isVerified : false
        });
    } else {
        console.log('[AuthController] Login failed - User not found:', phone);
        res.status(401);
        throw new Error('Unauthorized identification. Identity missing in system.');
    }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.user.id);
    if (user) {
        res.json(user);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Delete core identity and associated metadata
// @route   DELETE /api/auth/me
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
    console.log('[AuthController] Account deletion sequence initiated for UID:', req.user.id);
    const user = await User.findByPk(req.user.id);
    
    if (user) {
        // Purge user (Cascades to provider in the database if configured, but let's be explicit if needed)
        await user.destroy();
        console.log('[AuthController] Identity successfully purged from production node.');
        res.json({ message: 'Identity and associated data completely purged.' });
    } else {
        res.status(404);
        throw new Error('Identity not found in system.');
    }
});

module.exports = { registerUser, loginUser, getMe, deleteMe: deleteAccount };
