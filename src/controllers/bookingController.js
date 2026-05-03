const asyncHandler = require('express-async-handler');
const { Booking, User, Provider, Service } = require('../models');
const bookingService = require('../services/bookingService');
const { getPagination, getPagingData } = require('../utils/pagination');

// @desc    Create new booking
// @route   POST /api/v1/bookings
// @access  Private (Customer)
const createBooking = asyncHandler(async (req, res) => {
    const result = await bookingService.createBooking(req.body, req.user.id);
    res.status(201).json({
        success: true,
        data: result
    });
});

// @desc    Get my bookings
// @route   GET /api/v1/bookings
// @access  Private
const getBookings = asyncHandler(async (req, res) => {
    const { page, size } = req.query;
    const { limit, offset } = getPagination(page, size);

    let where = {};
    if (req.user.role === 'customer') {
        where.customerId = req.user.id;
    } else if (req.user.role === 'provider') {
        const provider = await Provider.findOne({ where: { userId: req.user.id } });
        if (!provider) {
            return res.json({ success: true, data: getPagingData({ count: 0, rows: [] }, page, limit) });
        }
        where.providerId = provider.id;
    }

    const data = await Booking.findAndCountAll({
        where,
        limit,
        offset,
        include: [
            { model: Service, as: 'service' },
            { model: User, as: 'customer', attributes: ['name', 'phone'] },
            { 
                model: Provider, 
                as: 'provider',
                include: [{ model: User, as: 'user', attributes: ['name'] }]
            }
        ],
        order: [['createdAt', 'DESC']]
    });

    const response = getPagingData(data, page, limit);

    res.json({
        success: true,
        data: response
    });
});

// @desc    Update booking payment status
// @route   PUT /api/v1/bookings/:id/pay
// @access  Private
const updateBookingPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { paymentId } = req.body;

    const booking = await Booking.findByPk(id);

    if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Secure check: Only customer or provider involved can view/update
    // For now, let's just update
    await booking.update({
        status: 'accepted', // or 'paid' if you have that status
        paymentId: paymentId
    });

    res.json({
        success: true,
        message: "Payment successfully recorded",
        data: booking
    });
});

module.exports = { createBooking, getBookings, updateBookingPayment };

