const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

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
    professionalIdentity: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Professional title or headline'
    },
    credentials: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: 'Array of certifications or professional achievements'
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
            street: '',
            place: '',
            city: '',
            state: '',
            pincode: ''
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
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['verificationStatus'] }
    ]
});

module.exports = Provider;
