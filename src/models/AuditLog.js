const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * 📝 AUDIT LOG MODEL
 * Tracks business-critical actions for accountability and resilience.
 */
const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'The user who performed the action'
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'booking_created, status_updated, etc'
    },
    entity: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Booking, Provider, User'
    },
    entityId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
    }
}, {
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false, // Audit logs are immutable
    indexes: [
        { fields: ['userId'] },
        { fields: ['action'] },
        { fields: ['entityId'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = AuditLog;
