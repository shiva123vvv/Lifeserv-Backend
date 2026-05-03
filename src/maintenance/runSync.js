const syncProviderServices = require('./syncServices');
const { testConnection } = require('../config/db');

async function run() {
    await testConnection();
    await syncProviderServices();
    process.exit(0);
}

run();
