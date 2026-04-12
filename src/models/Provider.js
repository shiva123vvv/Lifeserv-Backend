const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Provider = sequelize.define('Provider', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Professional biography entered during onboarding'
    },
    services: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: 'Array of {name, experienceYears, hourlyRate, fixedRate}'
    },
    documents: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: 'Array of {type, fileUrl, isVerified}'
    },
    availability: {
        type: DataTypes.JSONB,
        defaultValue: {
            days: [],
            startTime: '',
            endTime: ''
        }
    },
    location: {
        type: DataTypes.JSONB,
        defaultValue: {
            address: '',
            city: '',
            state: '',
            latitude: null,
            longitude: null
        }
    },
    rating: {
        type: DataTypes.DECIMAL(2, 1),
        defaultValue: 0.0
    },
    totalJobs: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    totalEarnings: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    verificationStatus: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
    },
    rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'providers',
    timestamps: true
});

module.exports = Provider;
