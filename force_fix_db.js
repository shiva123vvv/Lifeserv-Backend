const { sequelize } = require('./src/config/db');

async function forceFixDb() {
  try {
    console.log('--- 🚀 FORCE FIXING DATABASE ---');
    
    // 1. Ensure phone is VARCHAR(20)
    await sequelize.query('ALTER TABLE "users" ALTER COLUMN "phone" TYPE VARCHAR(20);');
    console.log('✅ Column type fixed');

    // 2. Drop unique constraint if exists
    await sequelize.query('ALTER TABLE "users" DROP CONSTRAINT IF EXISTS users_phone_key;');
    console.log('✅ Unique constraint dropped');

    // 3. Clear old broken data
    await sequelize.query('UPDATE "users" SET "phone" = NULL;');
    console.log('✅ Old phone data cleared');

    console.log('--- ✅ DATABASE FIX COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ DB FIX ERROR:', err.message);
    process.exit(1);
  }
}

forceFixDb();
