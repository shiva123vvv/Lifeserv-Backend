const { sequelize } = require('../config/database');

const User = require('./User');
const Provider = require('./Provider');
const Service = require('./Service');
const Booking = require('./Booking');
const Review = require('./Review');
const Payment = require('./Payment');
const JobOffer = require('./JobOffer');

// User - Provider Relationship
User.hasOne(Provider, { foreignKey: 'userId', as: 'providerProfile' });
Provider.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Provider - Service Relationship (Many-to-Many logic handled via JSONB in Provider model, 
// but Custom Services created by Provider logic below):
Provider.hasMany(Service, { foreignKey: 'createdBy', as: 'createdServices' });
Service.belongsTo(Provider, { foreignKey: 'createdBy', as: 'creator' });

// Booking Relationships
User.hasMany(Booking, { foreignKey: 'customerId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

Provider.hasMany(Booking, { foreignKey: 'providerId', as: 'jobs' });
Booking.belongsTo(Provider, { foreignKey: 'providerId', as: 'provider' });

Service.hasMany(Booking, { foreignKey: 'serviceId' });
Booking.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

// Review Relationships
Booking.hasOne(Review, { foreignKey: 'bookingId', as: 'review' });
Review.belongsTo(Booking, { foreignKey: 'bookingId' });

User.hasMany(Review, { foreignKey: 'customerId', as: 'writtenReviews' });
Review.belongsTo(User, { foreignKey: 'customerId', as: 'author' });

Provider.hasMany(Review, { foreignKey: 'providerId', as: 'reviews' });
Review.belongsTo(Provider, { foreignKey: 'providerId', as: 'recipient' });

// Payment Relationships
Booking.hasMany(Payment, { foreignKey: 'bookingId', as: 'payments' });
Payment.belongsTo(Booking, { foreignKey: 'bookingId' });

// JobOffer Relationships
User.hasMany(JobOffer, { foreignKey: 'customerId', as: 'jobOffers' });
JobOffer.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

module.exports = {
    sequelize,
    User,
    Provider,
    Service,
    Booking,
    Review,
    Payment,
    JobOffer
};
