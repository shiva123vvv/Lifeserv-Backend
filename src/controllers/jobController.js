const asyncHandler = require('express-async-handler');
const { JobOffer, User } = require('../models');

// @desc    Create a new job offer
// @route   POST /api/v1/jobs
// @access  Private (Customer)
const createJobOffer = asyncHandler(async (req, res) => {
    const { serviceName, title, description, budget, budgetType, location } = req.body;

    if (!serviceName || !title || !description || !budget) {
        res.status(400);
        throw new Error('Please provide all mandatory job details');
    }

    const jobOffer = await JobOffer.create({
        customerId: req.user.id,
        serviceName,
        title,
        description,
        budget,
        budgetType,
        location: location || { address: '', latitude: null, longitude: null }
    });

    res.status(201).json({
        success: true,
        data: jobOffer
    });
});

const { getPagination, getPagingData } = require('../utils/pagination');

// @desc    Get all open job offers
// @route   GET /api/v1/jobs
// @access  Public
const getJobOffers = asyncHandler(async (req, res) => {
    const { page, size } = req.query;
    const { limit, offset } = getPagination(page, size);

    const data = await JobOffer.findAndCountAll({
        where: { status: 'open' },
        limit,
        offset,
        include: [{ model: User, as: 'customer', attributes: ['name', 'photo'] }],
        order: [['createdAt', 'DESC']]
    });

    const response = getPagingData(data, page, limit);

    res.json({
        success: true,
        data: response
    });
});

// @desc    Get job offers by customer
// @route   GET /api/v1/jobs/my
// @access  Private (Customer)
const getMyJobOffers = asyncHandler(async (req, res) => {
    const { page, size } = req.query;
    const { limit, offset } = getPagination(page, size);

    const data = await JobOffer.findAndCountAll({
        where: { customerId: req.user.id },
        limit,
        offset,
        order: [['createdAt', 'DESC']]
    });

    const response = getPagingData(data, page, limit);

    res.json({
        success: true,
        data: response
    });
});

module.exports = {
    createJobOffer,
    getJobOffers,
    getMyJobOffers
};

