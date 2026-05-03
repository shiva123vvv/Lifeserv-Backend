const asyncHandler = require('express-async-handler');
const { User, Provider, Service } = require('../models');

/**
 * @desc    Update unified profile (User + Provider)
 * @route   PUT /api/v1/profile/update
 * @access  Private
 */
const updateFullProfile = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, bio, services, location, availability, professionalIdentity, credentials } = req.body;

        // 🔹 Update USER table
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        if (name !== undefined) user.name = name;
        if (phone !== undefined) user.phone = phone;

        await user.save();

        // 🔹 Update PROVIDER table
        const provider = await Provider.findOne({ where: { userId } });

        if (!provider) {
            return res.status(404).json({
                success: false,
                error: "Provider not found"
            });
        }

        if (bio !== undefined) provider.bio = bio;
        
        // 🔹 SYNC SERVICES WITH MASTER REGISTRY
        if (services !== undefined && Array.isArray(services)) {
            const synchronizedServices = [];
            for (const s of services) {
                const normalizedName = String(s.name || "").trim();
                if (!normalizedName) continue;

                // 🛡️ Find or create in master registry
                let [serviceRecord] = await Service.findOrCreate({
                    where: { name: normalizedName },
                    defaults: {
                        name: normalizedName,
                        category: "Other",
                        isCustom: true,
                        isApproved: true
                    }
                });

                synchronizedServices.push({
                    id: serviceRecord.id,
                    name: serviceRecord.name,
                    experienceYears: s.experienceYears || "",
                    hourlyRate: s.hourlyRate || "",
                    fixedRate: s.fixedRate || ""
                });
            }
            provider.services = synchronizedServices;
            provider.changed('services', true);
        }

        if (location !== undefined) provider.location = location;
        if (availability !== undefined) provider.availability = availability;
        if (professionalIdentity !== undefined) provider.professionalIdentity = professionalIdentity;
        if (credentials !== undefined) provider.credentials = credentials;

        await provider.save();

        console.log("📤 Provider Response:", provider.toJSON());

        return res.json({
            success: true,
            data: {
                user,
                provider
            }
        });
    } catch (error) {
        console.error("FULL PROFILE UPDATE ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Profile update failed"
        });
    }
});

module.exports = { updateFullProfile };
