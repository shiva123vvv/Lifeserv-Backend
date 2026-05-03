const logger = require('../utils/logger');

let errorCount = 0;
const ERROR_THRESHOLD = 10;
const RESET_INTERVAL = 60000; // 1 minute

setInterval(() => {
    if (errorCount > 0) {
        logger.info(`📊 [MONITORING] Errors in last minute: ${errorCount}`);
        errorCount = 0;
    }
}, RESET_INTERVAL);

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
    errorCount++;
    
    if (err.code === 'ETIMEDOUT' || req.timedout) {
        logger.error(`[⏳ TIMEOUT] ${req.method} ${req.originalUrl}`);
        return res.status(503).json({ success: false, error: 'Request timed out. Please try again.' });
    }

    logger.error(`[❌ ERROR] ${err.message}`);
    if (err.stack) logger.error(err.stack);

    if (errorCount >= ERROR_THRESHOLD) {
        logger.warn(`⚠️ [MONITORING] High error rate detected: ${errorCount} errors/min`);
    }

    // Use res.statusCode if it was set (e.g. 400, 401, 404), otherwise default to err.statusCode or 500
    const statusCode = (res.statusCode !== 200 ? res.statusCode : (err.statusCode || 500));
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler;

