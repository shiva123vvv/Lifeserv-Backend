const admin = require('firebase-admin');

/**
 * 🔐 Firebase Admin Implementation (Production Stable)
 * Prioritizes granular environment variables for cloud security.
 */
try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
        // Granular Environment Variables (Railway Best Practice)
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
    } else {
        // Fallback to local file for Development only
        const path = require('path');
        const fs = require('fs');
        const servicePath = path.join(__dirname, '../../firebase-service-account.json');
        
        if (fs.existsSync(servicePath)) {
            const serviceAccount = require(servicePath);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } else {
            console.error("❌ Firebase Configuration Missing: No private key or local file found.");
            process.exit(1);
        }
    }

    console.log("✅ Firebase initialized successfully");
} catch (error) {
    console.error("❌ Firebase Admin Initialization Error:", error.message);
    process.exit(1);
}

module.exports = admin;
