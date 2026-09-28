const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dateStrings: true,
};
const dbName = process.env.DB_NAME || 'staff_management';

let pool;

async function initDb() {
  const conn = await mysql.createConnection({ ...config, multipleStatements: true });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await conn.query(`USE \`${dbName}\``);
  await conn.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  await conn.end();

  pool = mysql.createPool({ ...config, database: dbName, connectionLimit: 10 });
  return pool;
}

function db() {
  if (!pool) throw new Error('Database not initialised');
  return pool;
}

module.exports = { initDb, db };
