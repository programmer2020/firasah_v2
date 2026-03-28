#!/usr/bin/env node
/**
 * Database Migration Runner
 * Executes SQL migrations to update the database schema
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('\n🔄 Running Database Migrations...\n');

  const migrationsDir = path.join(__dirname, 'database');
  const migrationFiles = [
    'rename-speech-to-lecture.sql',
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${file} (file not found)`);
      continue;
    }

    try {
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`📝 Executing: ${file}`);
      
      await pool.query(sql);
      console.log(`✅ ${file} completed successfully\n`);
    } catch (error) {
      console.error(`❌ Error executing ${file}:`);
      console.error(error.message);
      console.log('');
    }
  }

  console.log('✨ All migrations completed!\n');
  process.exit(0);
}

runMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
