const { Sequelize } = require('sequelize');
require('dotenv').config();

// 1. Extract and Clean DATABASE_URL
// Neon URLs often include channel_binding=require which some drivers/environments (like Railway) find problematic.
// We normalize it to only use sslmode=require.
const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
    console.error('❌ CRITICAL ERROR: DATABASE_URL is not defined in environment variables.');
    process.exit(1);
}

// Remove problematic query parameters like channel_binding
const cleanUrl = rawUrl.split('?')[0] + '?sslmode=require';

console.log('🔗 Database connection initialized via Environment Variable.');

const sequelize = new Sequelize(cleanUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false, // Production-ready: disable query logging
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // Required for Neon DB compatibility
        }
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL connected successfully to Neon/Railway');

        // Note: Manual syncing is usually avoided in production-ready apps 
        // using migrations, but we'll keep it for development speed if needed.
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('📊 Database models synchronized');
        }
    } catch (error) {
        console.error('❌ DB Connection Error:', error.message);
        if (error.parent) {
            console.error('🔍 Detail:', error.parent.message);
        }
        process.exit(1); // Exit process if DB fails as per requirements
    }
};

module.exports = { sequelize, connectDB };
