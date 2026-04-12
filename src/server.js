const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/services', require('./routes/services'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/jobs', require('./routes/jobs'));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Lifeserv API is operational',
        timestamp: new Date().toISOString()
    });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 8080;

// Start Server Wrapper
const startServer = async () => {
    try {
        // Essential: Connect to DB before accepting traffic
        await connectDB();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Lifeserv Backend operational on port ${PORT}`);
            console.log(`📡 Environment: ${process.env.NODE_ENV || 'production'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server due to DB connection issues:', error.message);
        process.exit(1);
    }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error(`❌ Unhandled Rejection: ${err.message}`);
    process.exit(1);
});

module.exports = app;
