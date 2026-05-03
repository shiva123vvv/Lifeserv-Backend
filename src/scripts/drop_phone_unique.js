const { sequelize } = require('../config/db');

async function fixUnique() {
    try {
        console.log("🛠️ Starting unique constraint cleanup...");
        
        // List of possible constraint names created by Sequelize or manually
        const constraints = [
            'users_phone_key',
            'users_phone_key1',
            'users_phone_key2',
            'users_phone_key3',
            'users_phone_key4'
        ];

        for (const constraint of constraints) {
            try {
                await sequelize.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "${constraint}";`);
                console.log(`✅ Attempted to drop: ${constraint}`);
            } catch (e) {
                console.log(`❌ Failed to drop ${constraint}: ${e.message}`);
            }
        }

        console.log("🚀 Constraint cleanup complete!");
        process.exit(0);
    } catch (err) {
        console.error("💥 FATAL ERROR:", err);
        process.exit(1);
    }
}

fixUnique();
