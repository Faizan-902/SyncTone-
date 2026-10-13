const { Pool } = require('pg');
const mongoose = require('mongoose');
const { config } = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on('error', (err) => {
  console.warn('[DB] Unexpected idle client error:', err.message);
});

async function connectMongo() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('[DB] Connected to MongoDB 7.0');
  } catch (err) {
    console.warn('[DB] MongoDB connection warning:', err.message);
  }
}

async function connectPostgres() {
  try {
    const client = await pool.connect();
    client.release();
    console.log('[DB] Connected to PostgreSQL 16');
  } catch (err) {
    console.warn('[DB] PostgreSQL connection warning:', err.message);
  }
}

module.exports = {
  pool,
  connectMongo,
  connectPostgres,
};
