const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const servicePath = path.join(__dirname, '../../firebase-service-account.json');

if (!fs.existsSync(servicePath)) {
    console.error('❌ Firebase Service Account file missing!');
    process.exit(1);
}

const serviceAccount = require(servicePath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

console.log('✅ Firebase initialized');

module.exports = admin;
