const asyncHandler = require('express-async-handler');
const { Review, JobRequest, Provider, User } = require('../models');

// @desc    Create a review for a completed job request
// @route   POST /api/v1/reviews
// @access  Private (Customer)
const createReview = asyncHandler(async (req, res) => {
    // Accept both jobRequestId and bookingId (backward compat)
    const jobRequestId = req.body.jobRequestId || req.body.bookingId;
    const { rating, review, photos } = req.body;

    console.log('[ReviewController] createReview called:', {
        jobRequestId,
        rating,
        review: review?.slice(0, 30),
        userId: req.user?.id
    });

    if (!jobRequestId) {
        res.status(400);
        throw new Error('jobRequestId is required');
    }

    if (!rating || rating < 1 || rating > 5) {
        res.status(400);
        throw new Error('Rating must be between 1 and 5');
    }

    // Find the job request
    const jobRequest = await JobRequest.findByPk(jobRequestId);
    console.log('[ReviewController] JobRequest found:', jobRequest ? `${jobRequest.id} status=${jobRequest.status}` : 'NOT FOUND');

    if (!jobRequest) {
        res.status(404);
        throw new Error(`Job request not found: ${jobRequestId}`);
    }

    // Verify the customer owns this job
    console.log('[ReviewController] Auth check:', { jobCustomerId: jobRequest.customerId, reqUserId: req.user?.id, match: jobRequest.customerId === req.user?.id });
    if (jobRequest.customerId !== req.user.id) {
        res.status(403);
        throw new Error('You are not authorized to review this job request');
    }

    // Status check — must be completed
    if (jobRequest.status !== 'completed') {
        res.status(400);
        throw new Error(`Cannot review this job — current status: ${jobRequest.status}. Only completed jobs can be reviewed.`);
    }

    // Check for duplicate review
    const existingReview = await Review.findOne({ where: { jobRequestId } });
    if (existingReview) {
        res.status(400);
        throw new Error('You have already submitted a review for this service');
    }

    // Create the review
    const newReview = await Review.create({
        jobRequestId,
        customerId: req.user.id,
        providerId: jobRequest.providerId,
        rating: Number(rating),
        review: review || '',
        photos: photos || []
    });

    console.log('[ReviewController] Review created:', newReview.id);

    // Update provider's average rating
    try {
        const provider = await Provider.findByPk(jobRequest.providerId);
        if (provider) {
            const allReviews = await Review.findAll({ where: { providerId: provider.id } });
            const totalRating = allReviews.reduce((acc, r) => acc + Number(r.rating), 0);
            provider.rating = parseFloat((totalRating / allReviews.length).toFixed(1));
            await provider.save();
            console.log(`[ReviewController] Provider ${provider.id} rating updated to ${provider.rating}`);
        }
    } catch (ratingErr) {
        console.warn('[ReviewController] Rating update warning:', ratingErr.message);
        // Non-fatal — review was already saved
    }

    res.status(201).json({
        success: true,
        data: newReview,
        message: 'Review published successfully'
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
        res.json({ success: true, data: review });
    } else {
        res.status(404);
        throw new Error('Review not found for this job request');
    }
});

module.exports = {
    createReview,
    getProviderReviews,
    getReviewByJobRequest
};
