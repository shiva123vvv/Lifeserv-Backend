require('dotenv-flow').config();
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    logger.error('❌ DATABASE_URL missing');
    process.exit(1);
}

/**
 * 🌐 SCALABLE POSTGRESQL CONFIGURATION
 * Optimized for high-load Railway environments.
 */
const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: (msg) => logger.info(`[DB] ${msg}`), // Log queries in dev
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
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
        logger.info('✅ Database pool established successfully');
        return true;
    } catch (err) {
        logger.error(`❌ Database pool initialization failed: ${err.message}`);
        return false;
    }
}

module.exports = { sequelize, testConnection };
