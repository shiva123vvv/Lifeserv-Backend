const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    jobRequestId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'job_requests',
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'INR'
    },
    paymentMethod: {
        type: DataTypes.STRING, // e.g., 'card', 'upi', 'wallet'
        allowNull: false
    },
    transactionId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    razorpayOrderId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    razorpayPaymentId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
        defaultValue: 'pending'
    }
}, {
    tableName: 'payments',
    timestamps: true
});

module.exports = Payment;
