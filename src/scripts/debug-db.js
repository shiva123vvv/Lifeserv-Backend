require('dotenv').config();
const { connectDB } = require('../config/db');

async function runDebug() {
    console.log('🚀 INITIALIZING DATABASE DEBUGGER...');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('-------------------------------------------');

    try {
        await connectDB();
        console.log('-------------------------------------------');
        console.log('🎉 RESULT: DATABASE IS FULLY OPERATIONAL');
        process.exit(0);
    } catch (err) {
        console.log('-------------------------------------------');
        console.error('❌ RESULT: DATABASE CONNECTIVITY FAILED');
        console.error('Check the logs above for the specific point of failure.');
        process.exit(1);
    }
}

runDebug();
