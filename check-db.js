const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        require: true, // Added 'require: true' for Neon DB compatibility
        rejectUnauthorized: false
    }
});

async function check() {
    try {
        await client.connect();
        console.log('✅ Auth successful');

        // Check if db exists
        // Use DB_NAME from env or default to SkillLink
        const dbName = process.env.DB_NAME || 'SkillLink';
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
        if (res.rows.length === 0) {
            console.log(`⚠️ Database "${dbName}" does not exist.`);
            try {
                await client.query(`CREATE DATABASE "${dbName}"`);
                console.log(`✅ Database "${dbName}" created.`);
            } catch (e) {
                console.log('❌ Failed to create database:', e.message);
            }
        } else {
            console.log(`✅ Database "${dbName}" exists.`);
        }
    } catch (err) {
        console.log('❌ Connection failed:', err.message);
        if (err.message.includes('password')) {
            console.log('👉 Please update DB_PASSWORD in backend/.env');
        }
    } finally {
        await client.end();
    }
}

check();
