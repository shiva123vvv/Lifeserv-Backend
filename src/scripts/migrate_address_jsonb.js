const { sequelize } = require('../config/db');

async function migrate() {
  try {
    console.log('🚀 Starting address column migration...');
    
    await sequelize.query(`
      ALTER TABLE users 
      ALTER COLUMN address TYPE JSONB 
      USING 
      CASE 
        WHEN address IS NULL THEN NULL 
        WHEN address = '' THEN NULL
        WHEN address LIKE '{%' THEN address::jsonb 
        ELSE jsonb_build_object('line', address) 
      END;
    `);

    console.log('✅ Migration successful: address column is now JSONB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
