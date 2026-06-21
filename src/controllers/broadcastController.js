const asyncHandler = require('express-async-handler');
const { Broadcast, BroadcastResponse, User, Provider } = require('../models');
const { Op } = require('sequelize');

/**
 * 📢 BROADCAST CONTROLLER
 */

// @desc    Create a new broadcast offer
// @route   POST /api/v1/broadcasts
// @access  Private (Customer)
exports.createBroadcast = asyncHandler(async (req, res) => {
    const { title, description, category, budget, location } = req.body;

    if (!title || !description || !category) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Set expiry to 2 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2);

    const broadcast = await Broadcast.create({
        customerId: req.user.id,
        title,
        description,
        category,
        budget,
        location,
        expiresAt
    });

    res.status(201).json({ success: true, data: broadcast });
});

// @desc    Get all active broadcasts
// @route   GET /api/v1/broadcasts
// @access  Private (Provider)
exports.getBroadcasts = asyncHandler(async (req, res) => {
    // 1. Resolve provider properly
    const provider = await Provider.findOne({
        where: { userId: req.user.id }
    });

    if (!provider) {
        return res.status(404).json({
            success: false,
            message: "Provider profile not found"
        });
    }

    // 2. Fix role check (Safe)
    if (req.user.role !== "provider") {
        return res.status(403).json({
            message: "Only providers can access this"
        });
    }

    // 3. Debug Log
    console.log("🔥 PROVIDER:", provider.id);

    const broadcasts = await Broadcast.findAll({
        where: {
            status: 'active',
            expiresAt: { [Op.gt]: new Date() }
        },
        include: [{ model: User, as: 'customer', attributes: ['name', 'photo', 'address'] }],
        order: [['createdAt', 'DESC']]
    });

    console.log(`[BroadcastAPI] Found ${broadcasts.length} active broadcasts for provider ${provider.id}`);

    res.json({ success: true, data: broadcasts });
});

// @desc    Get responses for a specific broadcast
// @route   GET /api/v1/broadcasts/:id/responses
// @access  Private (Customer)
exports.getBroadcastResponses = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const broadcast = await Broadcast.findByPk(id);
    
    // Allow the customer who owns it OR any provider (to check their bid status)
    if (!broadcast) {
        return res.status(404).json({ success: false, message: "Broadcast not identified" });
    }

    if (broadcast.customerId !== req.user.id && req.user.role !== 'provider') {
        return res.status(403).json({ success: false, message: "Access denied to this registry node" });
    }

    const responses = await BroadcastResponse.findAll({
        where: { broadcastId: id },
        include: [{ 
            model: Provider, 
            as: 'provider', 
            include: [{ model: User, as: 'user', attributes: ['name', 'photo', 'phone'] }] 
        }]
    });

    console.log(`[BroadcastAPI] Found ${responses.length} responses for broadcast ${id}`);

    res.json({ success: true, data: responses });
});

// @desc    Respond to a broadcast
// @route   POST /api/v1/broadcasts/respond
// @access  Private (Provider)
exports.respondToBroadcast = asyncHandler(async (req, res) => {
    const { broadcastId, message, quote } = req.body;

    const provider = await Provider.findOne({ where: { userId: req.user.id } });
    if (!provider) {
        return res.status(403).json({ success: false, message: "Only providers can respond" });
    }

    const broadcast = await Broadcast.findByPk(broadcastId);
    if (!broadcast || broadcast.status !== 'active' || broadcast.expiresAt < new Date()) {
        return res.status(400).json({ success: false, message: "Broadcast is no longer active" });
    }

    // Check if already responded
    const existing = await BroadcastResponse.findOne({
        where: { broadcastId, providerId: provider.id }
    });

    if (existing) {
        return res.status(400).json({ success: false, message: "You have already responded to this offer" });
    }

    const response = await BroadcastResponse.create({
        broadcastId,
        providerId: provider.id,
        message,
        quote
    });

    res.status(201).json({ success: true, data: response });
});

// @desc    Get my responses
// @route   GET /api/v1/broadcasts/my-responses
// @access  Private (Provider)
exports.getMyResponses = asyncHandler(async (req, res) => {
    const provider = await Provider.findOne({ where: { userId: req.user.id } });
    if (!provider) return res.status(403).json({ success: false, message: "Unauthorized" });

    const responses = await BroadcastResponse.findAll({
        where: { providerId: provider.id },
        include: [{ model: Broadcast, as: 'broadcast' }]
    });

    res.json({ success: true, data: responses });
});

// @desc    Get all broadcasts by customer (My Offers)
// @route   GET /api/v1/broadcasts/my
// @access  Private (Customer)
exports.getMyBroadcasts = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    console.log("🔥 [Controller] getMyBroadcasts HIT for USER:", userId);
    
    const broadcasts = await Broadcast.findAll({
        where: { customerId: userId },
        include: [{
            model: BroadcastResponse,
            as: 'responses',
            include: [{
                model: Provider,
                as: 'provider',
                include: [{ model: User, as: 'user', attributes: ['name', 'photo', 'phone'] }]
            }]
        }],
        order: [['createdAt', 'DESC']]
    });

    console.log(`[BroadcastAPI] Customer ${userId} fetched ${broadcasts.length} offers`);

    res.json({ success: true, data: broadcasts });
});

// @desc    Update a broadcast offer
// @route   PUT /api/v1/broadcasts/:id
// @access  Private (Customer)
exports.updateBroadcast = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, category, budget, location } = req.body;

    const broadcast = await Broadcast.findByPk(id);

    if (!broadcast || broadcast.customerId !== req.user.id) {
        return res.status(403).json({ success: false, message: "Unauthorized or not found" });
    }

    await broadcast.update({
        title: title || broadcast.title,
        description: description || broadcast.description,
        category: category || broadcast.category,
        budget: budget || broadcast.budget,
        location: location || broadcast.location
    });

    res.json({ success: true, data: broadcast });
});

// @desc    Delete a broadcast offer
// @route   DELETE /api/v1/broadcasts/:id
// @access  Private (Customer)
exports.deleteBroadcast = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const broadcast = await Broadcast.findByPk(id);

    if (!broadcast || broadcast.customerId !== req.user.id) {
        return res.status(403).json({ success: false, message: "Unauthorized or not found" });
    }

    // Delete associated responses first or let DB handle if CASCADE is set
    await BroadcastResponse.destroy({ where: { broadcastId: id } });
    await broadcast.destroy();

    res.json({ success: true, message: "Broadcast deleted successfully" });
});
