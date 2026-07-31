require('dotenv-flow').config();
const { sequelize } = require('./src/config/db');

(async () => {
  try {
    // Check counts of job_requests by paymentMethod
    const [counts] = await sequelize.query(`
      SELECT "paymentMethod", count(*)
      FROM job_requests
      GROUP BY "paymentMethod"
    `);
    console.log('Job counts by payment method:', counts);

    // Check recent job requests with detail
    const [recent] = await sequelize.query(`
      SELECT id, status, "paymentStatus", "paymentMethod", "totalAmount", "createdAt"
      FROM job_requests
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);
    console.log('\nRecent jobs in DB:', JSON.stringify(recent, null, 2));

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
})();
