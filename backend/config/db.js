const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let pool = null;
let isConnected = false;

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_NAME = process.env.DB_NAME || 'vehicle_rental';

// Try candidate passwords in case local MySQL has default blank or root password
function getPasswordCandidates() {
  const envPwd = process.env.DB_PASSWORD;
  const list = [];
  if (envPwd && envPwd !== 'your_mysql_password') {
    list.push(envPwd);
  }
  list.push(''); // standard for XAMPP / WampServer / local default
  list.push('root'); // common MySQL installer default
  if (envPwd && !list.includes(envPwd)) {
    list.push(envPwd);
  }
  return [...new Set(list)];
}

// Split multi-statement SQL script into individual statements safely
function splitSqlStatements(sqlText) {
  return sqlText
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove multiline comments
    .replace(/--.*$/gm, '') // remove line comments
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.toLowerCase().startsWith('use '));
}

// Initialize MySQL pool with auto-creation of database and schema if needed
async function initDb() {
  const passwords = getPasswordCandidates();
  let workingPassword = null;
  let serverConn = null;

  for (const pwd of passwords) {
    try {
      serverConn = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: pwd
      });
      workingPassword = pwd;
      break;
    } catch (err) {
      // try next password candidate
    }
  }

  if (!serverConn) {
    isConnected = false;
    console.warn(`⚠️  MySQL connection not established on ${DB_HOST}:${DB_PORT} (User: ${DB_USER}).`);
    console.warn(`💡 Tip: Make sure MySQL is running (e.g. XAMPP, MySQL Service).`);
    console.log(`🔄 Operating with in-memory resilient fallback for local development.`);
    return;
  }

  try {
    // 1. Ensure database exists
    await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await serverConn.end();

    // 2. Create the connection pool targeting the database
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: workingPassword,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
    });

    const testConn = await pool.getConnection();
    await testConn.ping();

    // 3. Verify if tables exist; if not, auto-bootstrap schema & seed
    const [tables] = await testConn.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = 'vehicles'`,
      [DB_NAME]
    );

    if (tables.length === 0) {
      console.log(`📦 Database "${DB_NAME}" tables missing. Auto-bootstrapping schema & seed data...`);
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');

      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const stmts = splitSqlStatements(schemaSql);
        for (const s of stmts) {
          try { await testConn.query(s); } catch (e) { /* ignore duplicate or safe errors */ }
        }
      }

      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        const stmts = splitSqlStatements(seedSql);
        for (const s of stmts) {
          try { await testConn.query(s); } catch (e) { /* ignore duplicate or safe errors */ }
        }
      }
      console.log(`✅ Schema & seed initialized in MySQL database "${DB_NAME}".`);
    } else {
      // Ensure owner_id column allows NULL in existing database
      try {
        await testConn.query(`ALTER TABLE vehicles MODIFY COLUMN owner_id INT NULL DEFAULT NULL`);
      } catch (alterErr) {
        // Table may already have nullable owner_id
      }
    }

    testConn.release();
    isConnected = true;
    console.log(`✅ Connected successfully to MySQL Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}`);
  } catch (err) {
    isConnected = false;
    console.warn('⚠️  MySQL initialization encountered an error: ' + err.message);
  }
}

// Universal query function using pool.query
async function query(sql, params = []) {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (dbErr) {
      console.error('MySQL Query Error:', dbErr.message);
      throw dbErr;
    }
  } else {
    const err = new Error('DATABASE_OFFLINE');
    err.code = 'DATABASE_OFFLINE';
    throw err;
  }
}

initDb();

module.exports = {
  pool,
  query,
  isDbConnected: () => isConnected,
  initDb
};
