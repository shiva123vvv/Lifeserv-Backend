const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
const { URL } = require('url');

const dbUrl = process.env.DATABASE_URL;

// 🛑 FAIL FAST: Validate DATABASE_URL before attempting connection
if (!dbUrl || dbUrl.includes('placeholder') || dbUrl.includes('@localhost')) {
    logger.error('❌ Invalid or missing DATABASE_URL. Ensure Railway environment variables are correctly set.');
    process.exit(1);
}

/**
 * 🔧 Convert Supabase direct connection URL to pooler URL (IPv4)
 * 
 * Supabase direct URLs (db.[ref].supabase.co) resolve to IPv6 addresses,
 * which don't work on Render's free tier. The pooler URL uses IPv4.
 * 
 * Direct:   postgresql://postgres:pass@db.[ref].supabase.co:5432/postgres
 * Pooler:   postgresql://postgres.[ref]:pass@aws-0-[region].pooler.supabase.com:5432/postgres
 * 
 * If the URL is already a pooler URL or non-Supabase, it's returned as-is.
 */
function ensureIPv4Url(url) {
    try {
        const parsed = new URL(url);
        
        // Check if this is a Supabase direct connection URL
        if (parsed.hostname && parsed.hostname.endsWith('.supabase.co') && 
            parsed.hostname.startsWith('db.')) {
            
            // Extract project ref from hostname: db.[ref].supabase.co
            const projectRef = parsed.hostname.replace('db.', '').replace('.supabase.co', '');
            
            // Get username and password from URL
            const username = parsed.username || 'postgres';
            const password = decodeURIComponent(parsed.password || '');
            const port = parsed.port || '5432';
            const database = parsed.pathname.slice(1) || 'postgres';
            
            // Try common Supabase pooler regions
            // The user should set SUPABASE_POOLER_REGION env var if needed
            const region = process.env.SUPABASE_POOLER_REGION || 'us-east-1';
            const poolerHost = `aws-0-${region}.pooler.supabase.com`;
            const poolerUser = `postgres.${projectRef}`;
            
            const poolerUrl = `postgresql://${poolerUser}:${encodeURIComponent(password)}@${poolerHost}:${port}/${database}`;
            logger.info(`🔧 Converted Supabase direct URL to pooler URL (IPv4): ${poolerHost}`);
            return poolerUrl;
        }
        
        return url;
    } catch (e) {
        logger.warn(`⚠️ Could not convert DATABASE_URL to pooler URL: ${e.message}`);
        return url;
    }
}

// Convert to IPv4 pooler URL if needed
const finalDbUrl = ensureIPv4Url(dbUrl);

try {
    const dbHost = new URL(finalDbUrl).hostname;
    logger.info(`📡 Connecting to database host: ${dbHost}`);
} catch (e) {
    logger.error('❌ Malformed DATABASE_URL: Could not parse hostname');
    process.exit(1);
}

/**
 * 🌐 SCALABLE POSTGRESQL CONFIGURATION
 * Optimized for high-load environments with SSL enabled by default.
 */
const sequelize = new Sequelize(finalDbUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false, // Disable verbose SQL logging in production for performance
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false, // Required for Railway and most cloud DB providers
        },
        family: 4, // Force IPv4 — fixes ENETUNREACH on Render (IPv6 not supported)
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