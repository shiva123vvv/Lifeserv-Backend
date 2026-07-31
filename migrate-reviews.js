require('dotenv-flow').config();
const { sequelize } = require('./src/config/db');

(async () => {
  try {
    // Check current columns
    const [cols] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'reviews'");
    console.log('Current reviews columns:', cols.map(c => c.column_name));

    // Add jobRequestId column if not exists
    await sequelize.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "jobRequestId" UUID REFERENCES job_requests(id)`);
    console.log('✅ Added jobRequestId column');

    // Drop old unique constraint on bookingId if exists
    try {
      await sequelize.query(`ALTER TABLE reviews DROP CONSTRAINT IF EXISTS "reviews_bookingId_key"`);
      console.log('✅ Dropped old bookingId unique constraint');
    } catch(e) {
      console.log('Note:', e.message);
    }

    // Add unique constraint on jobRequestId
    try {
      await sequelize.query(`ALTER TABLE reviews ADD CONSTRAINT "reviews_jobRequestId_key" UNIQUE ("jobRequestId")`);
      console.log('✅ Added unique constraint on jobRequestId');
    } catch(e) {
      console.log('Note (constraint may already exist):', e.message);
    }

    // Verify
    const [updatedCols] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'reviews'");
    console.log('Updated reviews columns:', updatedCols.map(c => c.column_name));
    console.log('✅ Migration complete');
  } catch(e) {
    console.error('❌ Migration error:', e.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
})();
