const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const JobOffer = sequelize.define('JobOffer', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    customerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    serviceName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Selected service category name'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    budget: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    budgetType: {
        type: DataTypes.ENUM('hourly', 'fixed'),
        defaultValue: 'fixed'
    },
    location: {
        type: DataTypes.JSONB,
        defaultValue: {
            address: '',
            latitude: null,
            longitude: null
        }
    },
    status: {
        type: DataTypes.ENUM('open', 'taken', 'closed'),
        defaultValue: 'open'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'job_offers',
    timestamps: true
});

module.exports = JobOffer;
