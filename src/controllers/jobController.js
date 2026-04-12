const asyncHandler = require('express-async-handler');
const { JobOffer, User } = require('../models');

// @desc    Create a new job offer
// @route   POST /api/jobs
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

    res.status(201).json(jobOffer);
});

// @desc    Get all open job offers
// @route   GET /api/jobs
// @access  Public
const getJobOffers = asyncHandler(async (req, res) => {
    const offers = await JobOffer.findAll({
        where: { status: 'open' },
        include: [{ model: User, as: 'customer', attributes: ['name', 'photo'] }],
        order: [['createdAt', 'DESC']]
    });

    res.json(offers);
});

// @desc    Get job offers by customer
// @route   GET /api/jobs/my
// @access  Private (Customer)
const getMyJobOffers = asyncHandler(async (req, res) => {
    const offers = await JobOffer.findAll({
        where: { customerId: req.user.id },
        order: [['createdAt', 'DESC']]
    });

    res.json(offers);
});

module.exports = {
    createJobOffer,
    getJobOffers,
    getMyJobOffers
};
