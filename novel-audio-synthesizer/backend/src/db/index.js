const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const mongoose = require('mongoose');
const { config } = require('../config');
const { prisma, getPrismaClient } = require('./prisma');

const pool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 15000,
  ...(config.pgSsl
    ? { ssl: { rejectUnauthorized: Boolean(config.pgSslRejectUnauthorized) } }
    : {}),
});

pool.on('error', (err) => {
  console.warn('[DB] Unexpected idle client error:', err.message);
});

function resolveSchemaSqlPath() {
  const candidates = [
    path.join(__dirname, 'schema.sql'),
    path.resolve(__dirname, '../../../../migrations/0001_initial_schema.sql'),
    path.resolve(__dirname, '../../../migrations/0001_initial_schema.sql'),
    path.resolve(__dirname, '../../migrations/0001_initial_schema.sql'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

/**
 * Ensures the 12-table Strict 4NF PostgreSQL schema exists in a fresh database
 * (e.g., newly provisioned Supabase or Neon instance) before app queries run.
 */
async function ensurePostgresSchema(pgPool = pool) {
  const check = await pgPool.query("SELECT to_regclass('public.novels') AS tbl");
  if (check.rows[0]?.tbl) {
    return false;
  }

  const sqlPath = resolveSchemaSqlPath();
  if (!sqlPath) {
    throw new Error('Schema SQL file not found for PostgreSQL initialization.');
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');
  await pgPool.query(sql);
  console.log('[DB] Initialized 12-table Strict 4NF PostgreSQL schema');
  return true;
}

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
    await ensurePostgresSchema(pool);
    const prismaClient = getPrismaClient();
    if (prismaClient) {
      await prismaClient.$connect().catch(() => {});
    }
    console.log('[DB] Connected to PostgreSQL 16 (pg pool + Prisma ORM)');
  } catch (err) {
    console.warn('[DB] PostgreSQL connection warning:', err.message);
  }
}

module.exports = {
  pool,
  prisma,
  getPrismaClient,
  ensurePostgresSchema,
  connectMongo,
  connectPostgres,
};
