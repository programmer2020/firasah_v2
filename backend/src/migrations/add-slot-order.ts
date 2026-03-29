/**
 * Migration: Add slot_order column to lecture table
 * This script adds the missing slot_order column required by the application
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { executeQuery } from '../helpers/database.js';

async function runMigration() {
  try {
    console.log('\n🔄 Running migration: Add slot_order column to lecture table\n');

    // Add slot_order column if it doesn't exist
    await executeQuery(`
      ALTER TABLE lecture
      ADD COLUMN IF NOT EXISTS slot_order INTEGER DEFAULT 0;
    `);

    console.log('✅ Added slot_order column to lecture table');

    // Create index for better query performance
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_lecture_slot_order ON lecture(slot_order);
    `);

    console.log('✅ Created index on slot_order');

    console.log('\n✨ Migration completed successfully!\n');

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Migration failed:', err?.message || err);
    process.exit(1);
  }
}

runMigration().catch((err: any) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
