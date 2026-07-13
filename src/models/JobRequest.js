const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const JobRequest = sequelize.define('JobRequest', {
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
  providerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'providers',
      key: 'id'
    }
  },
  serviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'services',
      key: 'id'
    }
  },
  pricingType: {
    type: DataTypes.ENUM('hourly', 'fixed'),
    allowNull: false
  },
  hours: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  serviceFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'ongoing', 'completed'),
    defaultValue: 'pending'
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customerPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Used for engagement date'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid'),
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.ENUM('online', 'cod'),
    defaultValue: 'online',
    allowNull: false
  },
  customerCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  providerCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'job_requests',
  timestamps: true
});

module.exports = JobRequest;
