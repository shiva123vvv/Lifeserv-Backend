require('dotenv-flow').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const timeout = require('connect-timeout');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const { testConnection } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

/**
 * 🚀 LIFESERV BACKEND - AUDITED STABLE
 */

const app = express();

// 1. SECURITY & LOGGING
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(xss());
app.use(timeout('15s'));
app.use((req, res, next) => { if (!req.timedout) next(); });

// Standard Logging (Morgan)
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// 2. RATE LIMITING
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api', apiLimiter);

// 3. ROUTES & CACHING CONTROL
const v1Router = express.Router();

// Middleware: Log and Disable Caching
v1Router.use((req, res, next) => {
    logger.info(`[v1Router] ${req.method} ${req.url}`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Explicit Routes
const broadcastRoutes = require('./routes/broadcasts');
app.use('/api/v1/broadcasts', broadcastRoutes);
console.log("✅ Broadcast routes mounted at /api/v1/broadcasts");

const userRoutes = require('./routes/users');
app.use('/api/v1/users', userRoutes);
console.log("✅ Users routes mounted at /api/v1/users");

// Registry
v1Router.use('/auth', require('./routes/auth'));
v1Router.use('/providers', require('./routes/providers'));
v1Router.use('/customers', require('./routes/customers'));
v1Router.use('/services', require('./routes/services'));
v1Router.use('/bookings', require('./routes/bookings'));
v1Router.use('/reviews', require('./routes/reviews'));
v1Router.use('/admin', require('./routes/adminRoutes'));
v1Router.use('/jobs', require('./routes/jobs'));
v1Router.use('/payments', require('./routes/payments'));
v1Router.use('/profile', require('./routes/profileRoutes'));
v1Router.use('/job-requests', require('./routes/jobRequests'));

// Consolidate into v1Router
v1Router.use('/withdraw', require('./routes/withdrawals'));
v1Router.get('/user/available-balance', require('./middleware/auth').protect, require('./controllers/withdrawalController').getAvailableBalance);
v1Router.get('/user/financial-summary', require('./middleware/auth').protect, require('./controllers/withdrawalController').getFinancialSummary);

// Removal of old direct app mounts

app.use('/api/v1', v1Router);
app.use('/api', v1Router); // Fallback

app.get('/api/v1/health', (req, res) => {
    res.json({ success: true, status: 'operational' });
});

// 4. AUTO-DELETE EXPIRED BROADCASTS (Every Hour)
const { Broadcast } = require('./models');
const { Op } = require('sequelize');
setInterval(async () => {
    try {
        const count = await Broadcast.destroy({
            where: {
                expiresAt: { [Op.lt]: new Date() }
            }
        });
        if (count > 0) logger.info(`[Cleanup] Deleted ${count} expired broadcasts`);
    } catch (err) {
        logger.error(`[Cleanup Error] ${err.message}`);
    }
}, 3600000); // 1 Hour

// 5. ERROR HANDLING
app.use(errorHandler);

// Global 404
app.use((req, res) => {
    console.warn(`[GLOBAL 404] ${req.method} ${req.originalUrl}`);
    res.status(404).json({ success: false, message: "Resource not identified" });
});

// 6. STARTUP
const start = async () => {
    try {
        logger.info('--- ⚙️ Initialization Sequence ---');
        
        // Environment Safety Audit
        console.log("ENV AUDIT:", {
            DATABASE_URL: !!process.env.DATABASE_URL,
            FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
            FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
            JWT_SECRET: !!process.env.JWT_SECRET
        });

        if (!process.env.JWT_SECRET) {
            logger.error("❌ JWT_SECRET missing from environment");
            process.exit(1);
        }

        require('./config/firebase');
        await testConnection();
        // ⚙️ Database Synchronization
        // Enable { alter: true } to automatically create/update tables on Railway
        const { sequelize } = require('./config/db');
        const models = require('./models');
        const { Admin } = models;

        logger.info('📡 Synchronizing database schema...');
        await sequelize.sync({ alter: true });
        logger.info('✅ Database schema synchronized');

        // 👑 Seed Default Admin (if none exists)
        const adminCount = await Admin.count();
        if (adminCount === 0) {
            logger.info('🌱 Seeding default admin account...');
            await Admin.create({
                email: 'admin@lifeserv.com',
                password: 'admin123', // Will be hashed by model hook if present, or stored as is
                role: 'admin'
            });
            logger.info('✅ Default admin created: admin@lifeserv.com / admin123');
        }
        
        const PORT = process.env.PORT || 5001;
        app.listen(PORT, '0.0.0.0', () => {
            logger.info(`✅ Lifeserv Production Ready: Port ${PORT}`);
        });
    } catch (err) {
        logger.error(`❌ FATAL CRASH: ${err.message}`);
        process.exit(1);
    }
};

start();
module.exports = app;
