const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PayoutMethod = sequelize.define('payout_method', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
    },
    type: {
        type: DataTypes.ENUM('bank', 'upi', 'phone'),
        allowNull: false,
    },
    accountNumber: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ifsc: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    accountName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    upiId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    provider: {
        type: DataTypes.ENUM('gpay', 'phonepe'),
        allowNull: true,
    }
}, {
    tableName: 'payout_methods',
    timestamps: true,
    underscored: true,
});

module.exports = PayoutMethod;
