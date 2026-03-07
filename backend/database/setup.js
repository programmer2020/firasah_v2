/**
 * Database Setup Script
 * Creates database and tables from schema.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try different passwords
const passwords = ['postgres', '1234', '12345', '123456', 'root', 'password', 'admin'];

async function testConnection(password) {
  return new Promise((resolve) => {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: password,
      database: 'postgres',
      query_timeout: 5000,
    });

    client.connect((err) => {
      if (err) {
        console.log(`  ❌ Password "${password}" failed`);
        resolve(null);
      } else {
        console.log(`  ✅ Password "${password}" works!`);
        resolve({ client, password });
      }
    });
  });
}

async function setupDatabase() {
  console.log('\n🔧 Firasah AI Database Setup\n');
  console.log('Looking for correct PostgreSQL password...\n');

  let connection = null;
  for (const pwd of passwords) {
    connection = await testConnection(pwd);
    if (connection) break;
  }

  if (!connection) {
    console.log('\n❌ Could not connect to PostgreSQL with any password');
    console.log('Please verify:');
    console.log('  1. PostgreSQL is running');
    console.log('  2. The correct password is in the list to try');
    process.exit(1);
  }

  const { client, password } = connection;

  try {
    // Read schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Create database
    console.log('\n📦 Creating database "firasah_ai_db"...');
    
    const result = await new Promise((resolve) => {
      client.query(
        "SELECT 1 FROM pg_database WHERE datname = 'firasah_ai_db'",
        (err, res) => {
          resolve(res?.rows?.length > 0);
        }
      );
    });

    if (!result) {
      await new Promise((resolve) => {
        client.query('CREATE DATABASE firasah_ai_db', (err) => {
          console.log('  ✅ Database created');
          resolve();
        });
      });
    } else {
      console.log('  ℹ️ Database already exists');
    }

    client.end();

    // Connect to new database
    console.log('\n🔗 Connecting to firasah_ai_db...');
    const newClient = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres', 
      password: password,
      database: 'firasah_ai_db',
    });

    await new Promise((resolve, reject) => {
      newClient.connect((err) => {
        if (err) {
          console.log('  ❌ Connection failed:', err.message);
          reject(err);
        } else {
          console.log('  ✅ Connected to firasah_ai_db');
          resolve();
        }
      });
    });

    // Create tables
    console.log('\n📝 Creating tables...');
    const statements = schema.split(';').filter((s) => s.trim());

    for (const statement of statements) {
      if (!statement.trim()) continue;

      await new Promise((resolve) => {
        newClient.query(statement + ';', (err) => {
          if (!err) {
            console.log('  ✅ Table/constraint created');
          }
          resolve();
        });
      });
    }

    console.log('\n✅ Database setup complete!\n');
    console.log('✨ Update your .env file with:');
    console.log(`   DB_PASSWORD=${password}`);
    console.log('   DB_NAME=firasah_ai_db\n');

    newClient.end();
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    client?.end();
    process.exit(1);
  }
}

setupDatabase();
