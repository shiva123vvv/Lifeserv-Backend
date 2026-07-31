const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * @desc    Update user phone number
 * @route   PATCH /api/v1/users/phone
 * @access  Private
 */
exports.updatePhone = async (req, res) => {
    try {
        let phone = String(req.body.phone).replace(/\D/g, "");
        console.log("📞 Backend receiving phone:", typeof phone, phone);

        if (!phone || phone.length < 10) {
            return res.status(400).json({
                success: false,
                message: "Invalid phone number"
            });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // If same phone → skip update (performance + avoid redundant DB writes)
        if (user.phone === phone) {
            return res.json({
                success: true,
                message: "Phone already synchronized",
                data: user
            });
        }

        // Atomic Update
        await User.update(
            { phone: phone },
            { where: { id: req.user.id } }
        );

        const updatedUser = await User.findByPk(req.user.id);
        console.log("✅ Phone updated successfully:", phone);
        logger.info(`User ${req.user.id} updated phone number to ${phone}`);

        res.status(200).json({
            success: true,
            message: "Identity phone updated",
            data: updatedUser
        });
    } catch (error) {
        console.error("🔥 PHONE UPDATE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Internal registry error during phone update"
        });
    }
};

/**
 * @desc    Update user profile details
 * @route   PATCH /api/v1/users/profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
    try {
        const { name, address, phone } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        // Validate Input
        if (req.body.name === "") {
             return res.status(400).json({ success: false, error: "Name cannot be empty" });
        }

        // Safe Update - Avoid null/undefined overrides
        user.name = name || user.name;
        user.address = address || user.address;
        user.phone = phone || user.phone;

        await user.save();

        logger.info(`User ${user.id} profile updated`);

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error("❌ BACKEND ERROR (updateProfile):", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

/**
 * @desc    Mark onboarding as complete
 * @route   PATCH /api/v1/users/onboarding-complete
 * @access  Private
 */
exports.completeOnboarding = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // 1. Update User status
        user.onboardingComplete = true;
        await user.save();

        // 2. Ensure Provider record exists for service providers
        if (user.role === 'provider') {
            const { Provider } = require('../models');
            let provider = await Provider.findOne({ where: { userId: user.id } });
            
            if (!provider) {
                logger.info(`Creating missing provider record for user ${user.id}`);
                provider = await Provider.create({
                    userId: user.id,
                    verificationStatus: 'pending'
                });
            } else {
                provider.verificationStatus = 'pending'; // Reset or ensure status
                await provider.save();
            }
        }

        logger.info(`User ${userId} completed onboarding sequence`);

        res.json({
            success: true,
            message: 'Onboarding marked as complete',
            data: user
        });
    } catch (err) {
        console.error("❌ BACKEND ERROR (completeOnboarding):", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

/**
 * @desc    Update user address and mark onboarding complete
 * @route   PATCH /api/v1/users/address
 * @access  Private
 */
exports.updateAddress = async (req, res) => {
    console.log("HIT ADDRESS ROUTE");
    const userId = req.user?.id;
    const { address } = req.body;

    console.log(`[AddressAPI] HIT - User: ${userId}`);
    console.log(`[AddressAPI] Payload:`, JSON.stringify(address));

    try {
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized: No user ID" });
        }

        const hasLegacyLine = address && address.line;
        const hasNewStreetAndPlace = address && address.street && address.place;

        if (!address || (!hasLegacyLine && !hasNewStreetAndPlace) || !address.city || !address.state || !address.pincode) {
            console.warn(`[AddressAPI] Validation Failed: Missing fields`);
            return res.status(400).json({
                success: false,
                message: "All address fields (street, place, city, state, pincode) are required."
            });
        }

        const user = await User.findByPk(userId);

        if (!user) {
            console.error(`[AddressAPI] User ${userId} not found in database`);
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Atomic Update
        await user.update({
            address,
            onboardingComplete: true
        });

        console.log(`[AddressAPI] SUCCESS: Address preserved for user ${userId}`);

        return res.status(200).json({
            success: true,
            message: "Address saved successfully",
            data: user
        });
    } catch (error) {
        console.error(`[AddressAPI] FATAL ERROR:`, error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during address preservation",
            error: error.message
        });
    }
};

/**
 * @desc    Switch user role between customer and provider
 * @route   PATCH /api/v1/users/switch-role
 * @access  Private
 */
exports.switchRole = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const newRole = user.role === 'provider' ? 'customer' : 'provider';
        user.role = newRole;

        if (newRole === 'provider') {
            const { Provider } = require('../models');
            let provider = await Provider.findOne({ where: { userId: user.id } });
            if (!provider) {
                logger.info(`Creating missing provider record for user ${user.id} during role switch`);
                await Provider.create({
                    userId: user.id,
                    verificationStatus: 'pending'
                });
            }
        }

        await user.save();
        logger.info(`User ${user.id} switched role to ${newRole}`);

        res.status(200).json({
            success: true,
            message: `Successfully switched to ${newRole}`,
            data: user
        });
    } catch (error) {
        console.error("🔥 ROLE SWITCH ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during role switch",
            error: error.message
        });
    }
};
