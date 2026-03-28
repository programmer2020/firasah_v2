#!/usr/bin/env node
/**
 * Direct SQL Migration for renaming speech to lecture
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'neondb_owner',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'neondb',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('\n🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('🔄 Running migration: Rename speech table to lecture\n');

    const result = await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'speech'
        ) THEN
          ALTER TABLE speech RENAME TO lecture;
          RAISE NOTICE 'Table speech renamed to lecture successfully';
        ELSIF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'lecture'
        ) THEN
          RAISE NOTICE 'Table lecture already exists - no operation needed';
        ELSE
          RAISE NOTICE 'Neither speech nor lecture table found';
        END IF;
      END $$;
    `);

    console.log('✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error && error.message ? error.message : String(error));
  } finally {
    await client.end();
    process.exit(0);
  }
}

runMigration();
