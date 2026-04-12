const { sequelize } = require('./database');
const { User, Provider, Service, Booking, Review, Payment } = require('../models');

const syncDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        // Force sync will drop tables and recreate them (USE WITH CAUTION)
        // await sequelize.sync({ force: true });

        // Alter sync will update tables to match models
        await sequelize.sync({ alter: true });

        console.log('✅ Database synced successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database sync failed:', error);
        process.exit(1);
    }
};

syncDatabase();
