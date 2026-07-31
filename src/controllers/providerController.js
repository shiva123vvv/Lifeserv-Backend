const asyncHandler = require('express-async-handler');
const { Provider, User, Service, Booking, Payment, AuditLog, JobRequest } = require('../models');
const { Op } = require('sequelize');
const { getPagination, getPagingData } = require('../utils/pagination');
const cacheService = require('../services/cacheService');
const jwt = require('jsonwebtoken');

/**
 * 🛠 PROVIDER CONTROLLER - PRODUCTION SAFE
 */

// @desc    Get provider profile
// @route   GET /api/v1/providers/profile
const getProviderProfile = asyncHandler(async (req, res) => {
    const provider = await Provider.findOne({
        where: { userId: req.user.id },
        include: [{ model: User, as: 'user', attributes: ['name', 'email', 'phone', 'photo'] }]
    });

    if (provider) {
        // 🔥 STEP 1: BACKEND DEBUG (MANDATORY)
        console.log("🔥 RAW PROVIDER SERVICES:", provider.services);

        // 🔥 STEP 2: DYNAMIC ID RECOVERY & NORMALIZATION
        const allMasterServices = await Service.findAll({ attributes: ['id', 'name'], where: { isApproved: true } });
        const serviceMap = {};
        allMasterServices.forEach(s => {
            serviceMap[s.name.toLowerCase().trim()] = s.id;
        });

        let services = provider.services;
        if (!services) services = [];
        if (typeof services === "string") {
            try {
                services = JSON.parse(services);
            } catch {
                services = [];
            }
        }

        // Standardize structure for matching & Inject IDs if missing
        services = services.map(s => {
            const normalizedName = String(s.name || s.serviceName || "").trim().toLowerCase();
            return {
                id: s.id || serviceMap[normalizedName], // 🛡️ Recover missing ID from master registry
                name: normalizedName,
                experienceYears: s.experienceYears || "",
                hourlyRate: s.hourlyRate || "",
                fixedRate: s.fixedRate || ""
            };
        });

        // 🔥 STEP 3: VERIFY RESPONSE FORMAT
        res.json({ 
            success: true, 
            data: {
                ...provider.toJSON(),
                services // Use normalized array
            } 
        });
    } else {
        res.status(404);
        throw new Error('Provider profile not found');
    }
});

// @desc    Update provider details
// @route   PUT /api/v1/providers/profile
const updateProviderProfile = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const provider = await Provider.findOne({ 
            where: { userId },
            include: [{ model: User, as: 'user' }]
        });

        if (!provider) {
            return res.status(404).json({ success: false, error: "Provider record missing." });
        }

        // 1. SAFE UPDATE Linked User (Name)
        if (req.body.name) {
            const user = await User.findByPk(userId);
            if (user) {
                user.name = req.body.name;
                await user.save();
            }
        }

        // 2. SAFE UPDATE Provider Fields (Except services)
        const allowedFields = ["bio", "availability", "location", "documents"];
        
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                provider[field] = req.body[field];
            }
        });

        if (req.body.location) {
            const user = await User.findByPk(userId);
            if (user) {
                user.address = req.body.location;
                await user.save();
            }
        }

        // 3. SYNC SERVICES WITH MASTER REGISTRY (CORE FIX)
        if (req.body.services) {
            const requestedServices = req.body.services;
            const synchronizedServices = [];

            for (const s of requestedServices) {
                const normalizedName = String(s.name || "").trim();
                if (!normalizedName) continue;

                // 🛡️ FIND OR CREATE in master registry
                let [serviceRecord] = await Service.findOrCreate({
                    where: { name: normalizedName },
                    defaults: {
                        name: normalizedName,
                        category: "Other", // Default category for new on-the-fly services
                        isCustom: true,
                        isApproved: true // Auto-approve for now to keep flow smooth
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

        const updatedProvider = await provider.save();
        
        // Invalidate cache
        cacheService.invalidatePattern('providers_');
        
        res.json({ success: true, data: updatedProvider });
    } catch (error) {
        console.error("❌ PROFILE UPDATE ERROR:", error);
        res.status(500).json({
            success: false,
            error: "System failure during profile preservation."
        });
    }
});

// @desc    Get all providers (Public w/ filters & pagination)
// @route   GET /api/v1/providers
const getProviders = asyncHandler(async (req, res) => {
    const { 
        category, rating, page, size 
    } = req.query;

    console.log(`[ProviderAPI] Discovery HIT - Category: ${category || 'all'}`);

    // Decode current user optionally if logged in to exclude them from results
    let currentUserId = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            currentUserId = decoded.id;
        } catch (e) {
            // Ignore optional auth decoding errors
        }
    }

    const queryOptions = {
        where: {},
        include: [{ model: User, as: 'user', attributes: ['name', 'photo', 'phone'] }],
        order: [['rating', 'DESC']]
    };

    if (rating) queryOptions.where.rating = { [Op.gte]: parseFloat(rating) };
    if (currentUserId) queryOptions.where.userId = { [Op.ne]: currentUserId };

    const allProviders = await Provider.findAll(queryOptions);

    // 🔥 FETCH MASTER REGISTRY FOR DYNAMIC ID ATTACHMENT
    const allMasterServices = await Service.findAll({ attributes: ['id', 'name'], where: { isApproved: true } });
    const serviceMap = {};
    allMasterServices.forEach(s => {
        serviceMap[s.name.toLowerCase().trim()] = s.id;
    });
    
    // 🔥 FORCE NORMALIZATION (Safe filtering & ID recovery)
    let filtered = allProviders.map(p => {
        const raw = p.toJSON();
        let services = raw.services;
        
        // Ensure services is always a valid array
        if (!services) services = [];
        if (typeof services === 'string') {
            try { services = JSON.parse(services); } catch { services = []; }
        }
        if (!Array.isArray(services)) services = [];

        // 🛡️ Inject missing IDs on the fly
        const normalized = services.map(s => ({
            ...s,
            id: s.id || serviceMap[String(s.name || "").toLowerCase().trim()]
        }));

        return { ...raw, services: normalized };
    });

    console.log(`[ProviderAPI] Real providers in DB: ${filtered.length}`);

    if (category) {
        filtered = filtered.filter(p => 
            p.services.some(s => 
                String(s.name || s.serviceName || "").toLowerCase().includes(category.toLowerCase())
            )
        );
        console.log(`[ProviderAPI] Filtered by category (${category}): ${filtered.length}`);
    }

    const { limit, offset } = getPagination(page, size);
    const paginatedItems = filtered.slice(offset, offset + limit);
    
    const response = {
        totalItems: filtered.length,
        items: paginatedItems,
        totalPages: Math.ceil(filtered.length / (limit || 10)),
        currentPage: page ? +page : 1
    };

    res.json({ success: true, data: response });
});

// @desc    Update job status
// @route   PUT /api/v1/providers/jobs/:id/:action
const updateJobStatus = asyncHandler(async (req, res) => {
    const { id, action } = req.params;
    const booking = await Booking.findByPk(id);

    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    let newStatus;
    switch (action) {
        case 'accept': newStatus = 'accepted'; break;
        case 'reject': newStatus = 'cancelled'; break;
        case 'complete':
            newStatus = 'completed';
            await Payment.create({
                bookingId: booking.id,
                amount: booking.price,
                currency: 'INR',
                paymentMethod: 'cash',
                status: 'completed'
            });
            break;
        default:
            res.status(400);
            throw new Error('Invalid action');
    }

    booking.status = newStatus;
    await booking.save();

    await AuditLog.create({
        userId: req.user.id,
        action: `job_${action}`,
        entity: 'Booking',
        entityId: booking.id,
        metadata: { status: newStatus }
    });

    res.json({ success: true, data: booking });
});

// @desc    Get earnings
const getProviderEarnings = asyncHandler(async (req, res) => {
    const provider = await Provider.findOne({ where: { userId: req.user.id } });
    if (!provider) return res.json({ success: true, data: { totalJobs: 0, activeJobs: 0, totalEarnings: 0, rating: 0 } });

    // Fetch all job requests for this provider
    const jobRequests = await JobRequest.findAll({ where: { providerId: provider.id } });

    const totalJobs = jobRequests.filter(j => j.paymentStatus === 'paid').length;
    const activeJobs = jobRequests.filter(j => j.status === 'ongoing').length;
    
    // 🔥 PURE CALCULATION: Sum only the base 'price' field, explicitly ignoring service fees
    const totalEarnings = jobRequests
        .filter(j => j.paymentStatus === 'paid')
        .reduce((acc, curr) => {
            const base = parseFloat(curr.price) || 0;
            const fee = parseFloat(curr.serviceFee) || 0;
            const total = parseFloat(curr.totalAmount) || 0;
            
            console.log(`🧾 [EarningsAudit] Job: ${curr.id} | Base: ₹${base} | Fee: ₹${fee} | Total: ₹${total}`);
            return acc + base;
        }, 0);

    const roundedEarnings = Math.round(totalEarnings * 100) / 100;
    console.log(`💰 [ProviderEarnings] ID: ${provider.id} | Final Calculated Net: ₹${roundedEarnings}`);

    res.json({
        success: true,
        data: { totalJobs, activeJobs, totalEarnings: roundedEarnings, rating: provider.rating || 0 }
    });
});

// @desc    Get by ID
const getProviderById = asyncHandler(async (req, res) => {
    const provider = await Provider.findByPk(req.params.id, {
        include: [{ model: User, as: 'user', attributes: ['name', 'photo', 'phone'] }]
    });

    if (provider) {
        // 🔥 DYNAMIC SERVICE NORMALIZATION
        let services = provider.services || [];
        if (typeof services === 'string') {
            try { services = JSON.parse(services); } catch { services = []; }
        }

        // Recover IDs from registry
        const allMasterServices = await Service.findAll({ attributes: ['id', 'name'], where: { isApproved: true } });
        const serviceMap = {};
        allMasterServices.forEach(s => {
            serviceMap[s.name.toLowerCase().trim()] = s.id;
        });

        const normalizedServices = services.map(s => ({
            ...s,
            id: s.id || serviceMap[String(s.name || "").toLowerCase().trim()]
        }));

        res.json({ 
            success: true, 
            data: { 
                ...provider.toJSON(), 
                services: normalizedServices 
            } 
        });
    } else {
        res.status(404);
        throw new Error('Provider not found');
    }
});

module.exports = { getProviderProfile, updateProviderProfile, getProviders, updateJobStatus, getProviderEarnings, getProviderById };
