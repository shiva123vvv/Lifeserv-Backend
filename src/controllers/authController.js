const asyncHandler = require('express-async-handler');
const { User, Provider } = require('../models');
const generateToken = require('../utils/generateToken');
const admin = require('../config/firebase');

// @desc    Auth user via Google Firebase Token
// @route   POST /api/auth/google
// @access  Public
const googleLogin = asyncHandler(async (req, res) => {
    try {
        const { idToken, role } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                error: "No Google token provided"
            });
        }

        // 🔥 Verify Firebase token
        const decoded = await admin.auth().verifyIdToken(idToken);
        const { uid, email, name, picture } = decoded;

        console.log("🔥 LOGIN ATTEMPT:", email);

        // 🔥 Check if user exists by firebaseUid
        let user = await User.findOne({ where: { firebaseUid: uid } });

        // If not found by UID, check by email (to link accounts if they existed before Firebase integration)
        if (!user && email) {
            user = await User.findOne({ where: { email } });
            if (user) {
                user.firebaseUid = uid;
                await user.save();
            }
        }

        // ✅ CREATE USER IF NOT EXISTS
        if (!user) {
            user = await User.create({
                name: name || "New User",
                email: email,
                firebaseUid: uid,
                role: role || "customer",
                photo: picture,
                isVerified: true,
                isActive: true
            });
            console.log("✅ NEW USER CREATED:", email);
            
            // If the user signed up as a provider, create the provider profile
            if (user.role === 'provider') {
                await Provider.create({ userId: user.id });
            }
        } else {
            // Ensure provider profile exists if role is provider (safety check)
            if (user.role === 'provider') {
                const provider = await Provider.findOne({ where: { userId: user.id } });
                if (!provider) {
                    await Provider.create({ userId: user.id });
                }
            }
        }

        // 🔥 Generate JWT
        const token = generateToken(user.id);

        return res.json({
            success: true,
            data: {
                _id: user.id,
                name: user.name,
                email: user.email,
                photo: user.photo,
                role: user.role,
                phone: user.phone,
                token,
                onboardingComplete: user.onboardingComplete || false
            }
        });

    } catch (error) {
        console.error("GOOGLE AUTH ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Authentication failed"
        });
    }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.user.id);
    if (user) {
        console.log(`🔥 [AuthSync] Syncing Identity for: ${user.email} (Role: ${user.role}, Onboarding: ${user.onboardingComplete})`);
        
        let address = user.address;
        if (!address || (typeof address === 'object' && Object.keys(address).length === 0)) {
            const provider = await Provider.findOne({ where: { userId: user.id } });
            if (provider && provider.location) {
                address = provider.location;
                // Sync User address field
                user.address = provider.location;
                await user.save();
            }
        }

        res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                photo: user.photo,
                address: address,
                onboardingComplete: user.onboardingComplete || false,
                isVerified: user.isVerified
            }
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Delete account
// @route   DELETE /api/auth/me
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.user.id);
    
    if (user) {
        await user.destroy();
        res.json({ 
            success: true,
            message: 'Identity and associated data completely purged.' 
        });
    } else {
        res.status(404);
        throw new Error('Identity not found in system.');
    }
});

module.exports = { googleLogin, getMe, deleteMe: deleteAccount };

