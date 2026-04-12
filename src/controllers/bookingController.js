const asyncHandler = require('express-async-handler');
const { Booking, User, Provider, Service } = require('../models');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private (Customer)
const createBooking = asyncHandler(async (req, res) => {
    const { providerId, serviceId, date, time, location, price } = req.body;

    const booking = await Booking.create({
        customerId: req.user.id,
        providerId,
        serviceId,
        date,
        time,
        location,
        price,
        status: 'pending'
    });

    res.status(201).json(booking);
});

// @desc    Get my bookings
// @route   GET /api/bookings
// @access  Private
const getBookings = asyncHandler(async (req, res) => {
    let where = {};
    if (req.user.role === 'customer') {
        where.customerId = req.user.id;
    } else if (req.user.role === 'provider') {
        // Need to find provider ID first
        const provider = await Provider.findOne({ where: { userId: req.user.id } });
        if (!provider) return res.json([]);
        where.providerId = provider.id;
    }

    const bookings = await Booking.findAll({
        where,
        include: [
            { model: Service, as: 'service' },
            { model: User, as: 'customer', attributes: ['name', 'phone'] }
        ],
        order: [['createdAt', 'DESC']]
    });

    res.json(bookings);
});

module.exports = { createBooking, getBookings };
