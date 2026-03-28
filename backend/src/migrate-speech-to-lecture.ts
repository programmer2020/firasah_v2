/**
 * Database Migration - Rename speech table to lecture
 */

import pool from './src/config/database.js';

async function migrate() {
  try {
    console.log('\n🔄 Running migration: Rename speech table to lecture\n');

    const result = await pool.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'speech'
        ) THEN
          ALTER TABLE speech RENAME TO lecture;
          RAISE NOTICE 'Table speech renamed to lecture';
        ELSIF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'lecture'
        ) THEN
          RAISE NOTICE 'Table lecture already exists';
        END IF;
      END $$;
    `);

    console.log('✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error?.message || String(error));
    process.exit(1);
  }
}

migrate();
