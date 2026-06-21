const { sequelize } = require('../config/db');

const User = require('./User');
const Provider = require('./Provider');
const Service = require('./Service');
const Booking = require('./Booking');
const Review = require('./Review');
const Payment = require('./Payment');
const JobOffer = require('./JobOffer');

const AuditLog = require('./AuditLog');
const Broadcast = require('./Broadcast');
const BroadcastResponse = require('./BroadcastResponse');
const JobRequest = require('./JobRequest');
const PayoutMethod = require('./PayoutMethod');
const Withdrawal = require('./Withdrawal');
const Admin = require('./Admin');

// User - Provider Relationship
User.hasOne(Provider, { foreignKey: 'userId', as: 'providerProfile' });
Provider.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Provider - Service Relationship
Provider.hasMany(Service, { foreignKey: 'createdBy', as: 'createdServices' });
Service.belongsTo(Provider, { foreignKey: 'createdBy', as: 'creator' });

// Booking Relationships
User.hasMany(Booking, { foreignKey: 'customerId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

Provider.hasMany(Booking, { foreignKey: 'providerId', as: 'jobs' });
Booking.belongsTo(Provider, { foreignKey: 'providerId', as: 'provider' });

Service.hasMany(Booking, { foreignKey: 'serviceId' });
Booking.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

// Review Relationships (linked to JobRequest)
JobRequest.hasOne(Review, { foreignKey: 'jobRequestId', as: 'review' });
Review.belongsTo(JobRequest, { foreignKey: 'jobRequestId' });

User.hasMany(Review, { foreignKey: 'customerId', as: 'writtenReviews' });
Review.belongsTo(User, { foreignKey: 'customerId', as: 'author' });

Provider.hasMany(Review, { foreignKey: 'providerId', as: 'reviews' });
Review.belongsTo(Provider, { foreignKey: 'providerId', as: 'recipient' });

// Payment Relationships (Linked to JobRequest)
JobRequest.hasMany(Payment, { foreignKey: 'jobRequestId', as: 'payments' });
Payment.belongsTo(JobRequest, { foreignKey: 'jobRequestId', as: 'jobRequest' });

// JobOffer Relationships
User.hasMany(JobOffer, { foreignKey: 'customerId', as: 'jobOffers' });
JobOffer.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

// Broadcast Relationships
User.hasMany(Broadcast, { foreignKey: 'customerId', as: 'broadcasts' });
Broadcast.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

Broadcast.hasMany(BroadcastResponse, { foreignKey: 'broadcastId', as: 'responses' });
BroadcastResponse.belongsTo(Broadcast, { foreignKey: 'broadcastId', as: 'broadcast' });

Provider.hasMany(BroadcastResponse, { foreignKey: 'providerId', as: 'responses' });
BroadcastResponse.belongsTo(Provider, { foreignKey: 'providerId', as: 'provider' });

// JobRequest Relationships
User.hasMany(JobRequest, { foreignKey: 'customerId', as: 'jobRequests' });
JobRequest.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

Provider.hasMany(JobRequest, { foreignKey: 'providerId', as: 'jobEngagements' });
JobRequest.belongsTo(Provider, { foreignKey: 'providerId', as: 'provider' });

Service.hasMany(JobRequest, { foreignKey: 'serviceId' });
JobRequest.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

// Payout & Withdrawal Relationships
User.hasOne(PayoutMethod, { foreignKey: 'userId', as: 'payoutMethod' });
PayoutMethod.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Withdrawal, { foreignKey: 'userId', as: 'withdrawals' });
Withdrawal.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
    sequelize,
    User,
    Provider,
    Service,
    Booking,
    Review,
    Payment,
    JobOffer,
    AuditLog,
    Broadcast,
    BroadcastResponse,
    JobRequest,
    PayoutMethod,
    Withdrawal,
    Admin
};
