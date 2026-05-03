const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Withdrawal = sequelize.define('withdrawal', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 1
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'paid', 'failed'),
        defaultValue: 'pending',
    }
}, {
    tableName: 'withdrawals',
    timestamps: true,
    underscored: true,
});

module.exports = Withdrawal;
