const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
const { URL } = require('url');

const dbUrl = process.env.DATABASE_URL;

// 🛑 FAIL FAST: Validate DATABASE_URL before attempting connection
if (!dbUrl || dbUrl.includes('placeholder') || dbUrl.includes('@localhost')) {
    logger.error('❌ Invalid or missing DATABASE_URL. Ensure Railway environment variables are correctly set.');
    process.exit(1);
}

try {
    const dbHost = new URL(dbUrl).hostname;
    logger.info(`📡 Connecting to database host: ${dbHost}`);
} catch (e) {
    logger.error('❌ Malformed DATABASE_URL: Could not parse hostname');
    process.exit(1);
}

/**
 * 🌐 SCALABLE POSTGRESQL CONFIGURATION
 * Optimized for high-load Railway environments with SSL enabled by default.
 */
const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false, // Disable verbose SQL logging in production for performance
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false, // Required for Railway and most cloud DB providers
        },
    },
    /**
     * Optimized Pooling for Scalability
     */
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
        evict: 10000,
    }
});

async function testConnection() {
    try {
        logger.info('📡 Initializing database connection pool...');
        await sequelize.authenticate();
        logger.info('✅ Database connection established successfully');
        return true;
    } catch (err) {
        logger.error(`❌ Database connection failed: ${err.message}`);
        return false;
    }
}

module.exports = { sequelize, testConnection };
