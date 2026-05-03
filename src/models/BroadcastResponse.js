const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BroadcastResponse = sequelize.define('BroadcastResponse', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    broadcastId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'broadcasts', key: 'id' }
    },
    providerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'providers', key: 'id' }
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    quote: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
        defaultValue: 'pending'
    }
}, {
    tableName: 'broadcast_responses',
    timestamps: true
});

module.exports = BroadcastResponse;
