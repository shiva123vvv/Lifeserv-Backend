const admin = require('firebase-admin');

/**
 * 🔐 Firebase Admin Implementation (Production Stable)
 * Supports 3 credential methods (checked in priority order):
 *   1. Granular env vars: FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *   2. Full JSON string:  FIREBASE_SERVICE_ACCOUNT (raw JSON or base64-encoded)
 *   3. Local file:        firebase-service-account.json (development only)
 *
 * If no credentials are found, the app will NOT crash.
 * Instead, a warning is logged and a no-op placeholder is exported
 * so the server can still start (Firebase features will be disabled).
 */

let firebaseInitialized = false;

try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
        // Method 1: Granular Environment Variables (Railway/Render Best Practice)
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
        firebaseInitialized = true;
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Method 2: Full Service Account JSON (base64 or raw) — easiest for cloud deploys
        let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        // Detect base64: if it doesn't start with '{', try decoding
        if (!raw.startsWith('{')) {
            raw = Buffer.from(raw, 'base64').toString('utf8');
        }
        const serviceAccount = JSON.parse(raw);
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: serviceAccount.project_id,
                clientEmail: serviceAccount.client_email,
                privateKey: serviceAccount.private_key,
            }),
        });
        firebaseInitialized = true;
    } else {
        // Method 3: Fallback to local file for Development only
        const path = require('path');
        const fs = require('fs');
        const servicePath = path.join(__dirname, '../../firebase-service-account.json');

        if (fs.existsSync(servicePath)) {
            const serviceAccount = require(servicePath);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            firebaseInitialized = true;
        } else {
            console.warn("⚠️  Firebase Configuration Missing — running in degraded mode.");
            console.warn("   Firebase features (push notifications, etc.) will be disabled.");
            console.warn("   To enable Firebase, set one of the following:");
            console.warn("   • FIREBASE_PRIVATE_KEY + FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL");
            console.warn("   • FIREBASE_SERVICE_ACCOUNT (base64 or raw JSON)");
            console.warn("   • Place firebase-service-account.json in /backend (dev only)");
        }
    }

    if (firebaseInitialized) {
        console.log("✅ Firebase initialized successfully");
    }
} catch (error) {
    console.error("❌ Firebase Admin Initialization Error:", error.message);
    console.warn("⚠️  Continuing in degraded mode — Firebase features will be disabled.");
}

// If Firebase was not initialized, export a no-op mock so requires don't crash
if (!firebaseInitialized) {
    const noopProxy = new Proxy({}, {
        get: () => {
            // Return a function for any property access
            return () => Promise.resolve(null);
        }
    });

    module.exports = {
        ...admin,
        messaging: () => ({
            send: () => Promise.resolve(null),
            sendMulticast: () => Promise.resolve({ successCount: 0, failureCount: 0 }),
            sendAll: () => Promise.resolve({ successCount: 0, failureCount: 0 }),
            subscribeToTopic: () => Promise.resolve(null),
            unsubscribeFromTopic: () => Promise.resolve(null),
        }),
        auth: () => ({
            verifyIdToken: () => Promise.resolve({ uid: null }),
            getUser: () => Promise.resolve(null),
            createUser: () => Promise.resolve(null),
            deleteUser: () => Promise.resolve(null),
        }),
        firestore: () => noopProxy,
        initialized: false,
    };
} else {
    admin.initialized = true;
    module.exports = admin;
}