const asyncHandler = require('express-async-handler');
const { Provider, User, Service, Booking, Payment } = require('../models');

// @desc    Get provider profile
// @route   GET /api/providers/profile
// @access  Private (Provider)
// @desc    Get provider profile
// @route   GET /api/providers/profile
// @access  Private (Provider)
// @desc    Get provider profile
// @route   GET /api/providers/profile
// @access  Private (Provider)
const getProviderProfile = asyncHandler(async (req, res) => {
    const provider = await Provider.findOne({
        where: { userId: req.user.id },
        include: [{ model: User, as: 'user', attributes: ['name', 'email', 'phone', 'photo'] }]
    });

    if (provider) {
        res.json(provider);
    } else {
        res.status(404);
        throw new Error('Provider profile not found');
    }
});

// @desc    Update provider details (services, location, etc)
// @route   PUT /api/providers/profile
// @access  Private (Provider)
const updateProviderProfile = asyncHandler(async (req, res) => {
    const provider = await Provider.findOne({ where: { userId: req.user.id } });

    if (provider) {
        // Update fields if provided
        if (req.body.bio) provider.bio = req.body.bio;
        if (req.body.services) provider.services = req.body.services;
        if (req.body.availability) provider.availability = req.body.availability;
        if (req.body.location) provider.location = req.body.location;
        if (req.body.isVerified !== undefined) provider.isVerified = req.body.isVerified;

        const updatedProvider = await provider.save();
        res.json(updatedProvider);
    } else {
        res.status(404);
        throw new Error('Provider profile not found');
    }
});

const { Op } = require('sequelize');

// @desc    Get all providers (Public w/ filters)
// @route   GET /api/providers
// @access  Public
const getProviders = asyncHandler(async (req, res) => {
    const { 
        category, 
        minPrice, 
        maxPrice, 
        rating, 
        location, 
        sort,
        availability 
    } = req.query;

    const queryOptions = {
        where: {},
        include: [{ 
            model: User, 
            as: 'user', 
            attributes: ['name', 'photo'] 
        }],
        order: []
    };

    if (rating) {
        queryOptions.where.rating = { [Op.gte]: parseFloat(rating) };
    }

    if (availability === 'true') {
        queryOptions.where.isVerified = true;
    }

    // Sorting
    if (sort) {
        switch (sort) {
            case 'price_low':
                queryOptions.order.push([sequelize.json('services[0].startingPrice'), 'ASC']);
                break;
            case 'price_high':
                queryOptions.order.push([sequelize.json('services[0].startingPrice'), 'DESC']);
                break;
            case 'top_rated':
                queryOptions.order.push(['rating', 'DESC']);
                break;
            case 'newest':
                queryOptions.order.push(['createdAt', 'DESC']);
                break;
        }
    }

    const providers = await Provider.findAll(queryOptions);

    let enrichedProviders = providers.map(p => p.toJSON());

    // In-memory filters for nested JSONB data structure (onboarding-specific)
    if (category) {
        enrichedProviders = enrichedProviders.filter(p => 
            p.services.some(s => s.name?.toLowerCase() === category.toLowerCase())
        );
    }

    if (maxPrice) {
        enrichedProviders = enrichedProviders.filter(p => 
            p.services.some(s => parseFloat(s.startingPrice) <= parseFloat(maxPrice))
        );
    }

    if (minPrice) {
        enrichedProviders = enrichedProviders.filter(p => 
            p.services.some(s => parseFloat(s.startingPrice) >= parseFloat(minPrice))
        );
    }

    if (location) {
        enrichedProviders = enrichedProviders.filter(p => 
            p.location?.city?.toLowerCase().includes(location.toLowerCase()) ||
            p.location?.address?.toLowerCase().includes(location.toLowerCase())
        );
    }

    res.json(enrichedProviders);
});

// ... existing code ...

// @desc    Update job status (Accept/Reject/Complete)
// @route   PUT /api/providers/jobs/:id/:action
// @access  Private (Provider)
const updateJobStatus = asyncHandler(async (req, res) => {
    const { id, action } = req.params;
    const booking = await Booking.findByPk(id);

    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    // Verify ownership
    // Ideally check if booking.providerId matches current user's provider profile



    let newStatus;
    switch (action) {
        case 'accept':
            newStatus = 'accepted';
            break;
        case 'reject':
            newStatus = 'cancelled';
            break;
        case 'complete':
            newStatus = 'completed';
            // Create payment record
            await Payment.create({
                bookingId: booking.id,
                amount: booking.price,
                currency: 'INR',
                paymentMethod: 'cash', // Defaulting to cash for now
                status: 'completed'
            });
            break;
        default:
            res.status(400);
            throw new Error('Invalid action');
    }

    booking.status = newStatus;
    await booking.save();

    res.json(booking);
});

// @desc    Get provider earnings stats
// @route   GET /api/providers/earnings
// @access  Private (Provider)
const getProviderEarnings = asyncHandler(async (req, res) => {
    const provider = await Provider.findOne({ where: { userId: req.user.id } });
    if (!provider) {
        res.json({ totalJobs: 0, activeJobs: 0, totalEarnings: 0, rating: 0 });
        return;
    }

    const bookings = await Booking.findAll({ where: { providerId: provider.id } });

    const totalJobs = bookings.length;
    const activeJobs = bookings.filter(b => ['pending', 'accepted', 'ongoing'].includes(b.status)).length;
    const completedJobs = bookings.filter(b => b.status === 'completed');
    const totalEarnings = completedJobs.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);

    res.json({
        totalJobs,
        activeJobs,
        totalEarnings,
        rating: provider.rating || 0
    });
});


// @desc    Get provider by ID (Public)
// @route   GET /api/providers/:id
// @access  Public
const getProviderById = asyncHandler(async (req, res) => {
    const provider = await Provider.findByPk(req.params.id, {
        include: [{ model: User, as: 'user', attributes: ['name', 'photo', 'phone'] }]
    });

    if (provider) {
        res.json(provider);
    } else {
        res.status(404);
        throw new Error('Provider not found');
    }
});

module.exports = { getProviderProfile, updateProviderProfile, getProviders, updateJobStatus, getProviderEarnings, getProviderById };
