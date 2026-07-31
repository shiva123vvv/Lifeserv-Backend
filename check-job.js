require('dotenv-flow').config();
const { sequelize } = require('./src/config/db');

(async () => {
  try {
    const jobId = '3bbc95e6-7efe-49eb-b824-2f9f9b9c8aa9';

    // Check the specific job request
    const [rows] = await sequelize.query(
      `SELECT id, status, "customerId", "providerId", "paymentStatus", "customerCompleted", "providerCompleted" FROM job_requests WHERE id = '${jobId}'`
    );
    console.log('Job request:', JSON.stringify(rows, null, 2));

    // Check if review already exists
    const [reviews] = await sequelize.query(
      `SELECT id, rating, review FROM reviews WHERE "jobRequestId" = '${jobId}'`
    );
    console.log('Existing reviews for this job:', JSON.stringify(reviews, null, 2));

    // Check all completed job requests
    const [completed] = await sequelize.query(
      `SELECT id, status, "paymentStatus", "customerCompleted", "providerCompleted" FROM job_requests WHERE status = 'completed' LIMIT 5`
    );
    console.log('\nCompleted jobs in DB:', JSON.stringify(completed, null, 2));

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
})();
