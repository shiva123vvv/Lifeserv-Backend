const { Op } = require('sequelize');
const { Booking, AuditLog } = require('../models');
const { sequelize } = require('../config/db');

/**
 * 📦 BOOKING BUSINESS SERVICE
 */
class BookingService {
    async createBooking(bookingData, userId) {
        // Idempotency Check: Prevent duplicate bookings within 5 mins
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existing = await Booking.findOne({
            where: {
                customerId: userId,
                providerId: bookingData.providerId,
                serviceId: bookingData.serviceId,
                createdAt: { [Op.gte]: fiveMinsAgo },
                status: { [Op.in]: ['pending', 'accepted'] }
            }
        });

        if (existing) {
            throw new Error('A similar booking was recently created. Please wait a few minutes.');
        }

        return await sequelize.transaction(async (t) => {
            const booking = await Booking.create({
                ...bookingData,
                customerId: userId,
                status: 'pending'
            }, { transaction: t });

            await AuditLog.create({
                userId: userId,
                action: 'booking_created',
                entity: 'Booking',
                entityId: booking.id,
                metadata: { price: bookingData.price, serviceId: bookingData.serviceId }
            }, { transaction: t });

            return booking;
        });
    }

    async updateStatus(bookingId, action, userId) {
        const booking = await Booking.findByPk(bookingId);
        if (!booking) throw new Error('Booking not found');

        let newStatus;
        switch (action) {
            case 'accept': newStatus = 'accepted'; break;
            case 'reject': newStatus = 'cancelled'; break;
            case 'complete': newStatus = 'completed'; break;
            default: throw new Error('Invalid action');
        }

        booking.status = newStatus;
        await booking.save();

        await AuditLog.create({
            userId,
            action: `job_${action}`,
            entity: 'Booking',
            entityId: booking.id,
            metadata: { status: newStatus }
        });

        return booking;
    }
}

module.exports = new BookingService();
