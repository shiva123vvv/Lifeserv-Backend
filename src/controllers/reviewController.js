const asyncHandler = require('express-async-handler');
const { Review, JobRequest, Provider, User } = require('../models');

// @desc    Create a review for a completed job request
// @route   POST /api/v1/reviews
// @access  Private (Customer)
const createReview = asyncHandler(async (req, res) => {
    const { jobRequestId, rating, review, photos } = req.body;

    console.log('[ReviewController] createReview called:', { jobRequestId, rating, userId: req.user?.id });

    if (!jobRequestId) {
        res.status(400);
        throw new Error('jobRequestId is required');
    }

    const jobRequest = await JobRequest.findByPk(jobRequestId);

    if (!jobRequest) {
        res.status(404);
        throw new Error('Job request not found');
    }

    if (jobRequest.status !== 'completed') {
        res.status(400);
        throw new Error('You can only review completed services');
    }

    if (jobRequest.customerId !== req.user.id) {
        res.status(401);
        throw new Error('You are not authorized to review this job request');
    }

    const existingReview = await Review.findOne({ where: { jobRequestId } });
    if (existingReview) {
        res.status(400);
        throw new Error('You have already reviewed this job');
    }

    const newReview = await Review.create({
        jobRequestId,
        customerId: req.user.id,
        providerId: jobRequest.providerId,
        rating,
        review,
        photos: photos || []
    });

    // Update provider's average rating
    const provider = await Provider.findByPk(jobRequest.providerId);
    if (provider) {
        const reviews = await Review.findAll({ where: { providerId: provider.id } });
        const totalRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
        provider.rating = parseFloat((totalRating / reviews.length).toFixed(1));
        await provider.save();
    }

    console.log('[ReviewController] Review created successfully:', newReview.id);

    res.status(201).json({
        success: true,
        data: newReview
    });
});

// @desc    Get all reviews for a provider
// @route   GET /api/v1/reviews/provider/:providerId
// @access  Public
const getProviderReviews = asyncHandler(async (req, res) => {
    const reviews = await Review.findAll({
        where: { providerId: req.params.providerId },
        include: [
            { 
                model: User, 
                as: 'author', 
                attributes: ['name', 'photo'] 
            }
        ],
        order: [['createdAt', 'DESC']]
    });

    res.json({
        success: true,
        data: reviews
    });
});

// @desc    Get a review by job request ID
// @route   GET /api/v1/reviews/job-request/:jobRequestId
// @access  Public
const getReviewByJobRequest = asyncHandler(async (req, res) => {
    const review = await Review.findOne({
        where: { jobRequestId: req.params.jobRequestId },
        include: [
            { 
                model: User, 
                as: 'author', 
                attributes: ['name', 'photo'] 
            }
        ]
    });

    if (review) {
        res.json({
            success: true,
            data: review
        });
    } else {
        res.status(404);
        throw new Error('Review not found');
    }
});

module.exports = {
    createReview,
    getProviderReviews,
    getReviewByJobRequest
};
