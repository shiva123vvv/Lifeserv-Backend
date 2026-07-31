require('dotenv-flow').config();
const { sequelize } = require('./src/config/db');

(async () => {
  try {
    console.log('Running production reviews migration...');

    // 1. Make bookingId nullable (was NOT NULL, blocks new reviews)
    await sequelize.query(`ALTER TABLE reviews ALTER COLUMN "bookingId" DROP NOT NULL;`);
    console.log('✅ bookingId is now nullable');

    // 2. Add jobRequestId if not exists
    await sequelize.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "jobRequestId" UUID REFERENCES job_requests(id);`);
    console.log('✅ jobRequestId column verified');

    // 3. Drop old unique constraint on bookingId
    await sequelize.query(`ALTER TABLE reviews DROP CONSTRAINT IF EXISTS "reviews_bookingId_key";`);
    console.log('✅ Dropped old bookingId unique constraint');

    // 4. Add unique constraint on jobRequestId
    try {
      await sequelize.query(`ALTER TABLE reviews ADD CONSTRAINT "reviews_jobRequestId_key" UNIQUE ("jobRequestId");`);
      console.log('✅ Added unique constraint on jobRequestId');
    } catch(e) {
      console.log('Note (constraint may exist):', e.message);
    }

    // 5. Verify final state
    const [cols] = await sequelize.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'reviews' 
      ORDER BY ordinal_position
    `);
    console.log('\nFinal reviews table columns:');
    cols.forEach(c => console.log(`  ${c.column_name} - nullable:${c.is_nullable} type:${c.data_type}`));

    console.log('\n✅ Migration complete!');
  } catch(e) {
    console.error('❌ Migration failed:', e.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
})();
