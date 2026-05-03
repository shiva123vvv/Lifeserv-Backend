const asyncHandler = require('express-async-handler');
const { Review, Booking, Provider, User } = require('../models');

// @desc    Create a review for a booking
// @route   POST /api/v1/reviews
// @access  Private (Customer)
const createReview = asyncHandler(async (req, res) => {
    const { bookingId, rating, review, photos } = req.body;

    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    if (booking.status !== 'completed') {
        res.status(400);
        throw new Error('You can only review completed services');
    }

    if (booking.customerId !== req.user.id) {
        res.status(401);
        throw new Error('You are not authorized to review this booking');
    }

    const existingReview = await Review.findOne({ where: { bookingId } });
    if (existingReview) {
        res.status(400);
        throw new Error('You have already reviewed this booking');
    }

    const newReview = await Review.create({
        bookingId,
        customerId: req.user.id,
        providerId: booking.providerId,
        rating,
        review,
        photos: photos || []
    });

    // Update provider's average rating
    const provider = await Provider.findByPk(booking.providerId);
    if (provider) {
        const reviews = await Review.findAll({ where: { providerId: provider.id } });
        const totalRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
        provider.rating = parseFloat((totalRating / reviews.length).toFixed(1));
        await provider.save();
    }

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

// @desc    Get a review by booking ID
// @route   GET /api/v1/reviews/booking/:bookingId
// @access  Public
const getReviewByBooking = asyncHandler(async (req, res) => {
    const review = await Review.findOne({
        where: { bookingId: req.params.bookingId },
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
    getReviewByBooking
};

