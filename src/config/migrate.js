const { sequelize } = require('./db');
const { User, Provider, Service, Booking, Review, Payment, JobOffer } = require('../models');

/**
 * 🛠 DATABASE MIGRATION SCRIPT
 * Synchronizes models with Railway PostgreSQL schema.
 */
const syncDatabase = async () => {
    try {
        console.log('📡 Initiating database synchronization...');
        await sequelize.authenticate();
        console.log('✅ Connection established.');

        // Alter mode: Updates existing tables without dropping them
        await sequelize.sync({ alter: true });

        console.log('✅ Railway schema successfully synchronized.');
        process.exit(0);
    } catch (error) {
        console.error('❌ MIGRATION ERROR:', error.message);
        process.exit(1);
    }
};

syncDatabase();

