/**
 * Migration: Create fragments table and add time_slot_id to lecture table
 * Purpose: Store 15-minute audio fragments and link them to lectures and time slots
 */

import pool from '../src/config/database.js';

export const up = async () => {
  try {
    
    // Create fragments table
    console.log('[Migration] Creating fragments table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fragments (
        id SERIAL PRIMARY KEY,
        file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
        lecture_id INTEGER REFERENCES lecture(id) ON DELETE CASCADE,
        time_slot_id INTEGER REFERENCES section_time_slots(time_slot_id) ON DELETE SET NULL,
        fragment_order INTEGER NOT NULL,
        start_seconds DECIMAL(10, 2) NOT NULL,
        end_seconds DECIMAL(10, 2) NOT NULL,
        duration DECIMAL(10, 2) NOT NULL,
        fragment_path VARCHAR(500),
        transcript TEXT COLLATE "C",
        language VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_fragments_file_id ON fragments(file_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_fragments_lecture_id ON fragments(lecture_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_fragments_time_slot_id ON fragments(time_slot_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_fragments_order ON fragments(file_id, fragment_order)
    `);
    
    console.log('[Migration] ✅ Fragments table created successfully');
    
    // Add time_slot_id to lecture table if not present
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lecture' AND column_name = 'time_slot_id'
    `);
    
    if (result.rows.length === 0) {
      console.log('[Migration] Adding time_slot_id column to lecture table...');
      await pool.query(`
        ALTER TABLE lecture 
        ADD COLUMN time_slot_id INTEGER REFERENCES section_time_slots(time_slot_id) ON DELETE SET NULL
      `);
      console.log('[Migration] ✅ time_slot_id column added to lecture table');
    } else {
      console.log('[Migration] ℹ️  time_slot_id column already exists in lecture table');
    }
    
    console.log('[Migration] ✅ Migration completed successfully');
  } catch (err) {
    console.error('[Migration] ❌ Migration failed:', err);
    throw err;
  }
};

export const down = async () => {
  try {
    console.log('[Migration] Rolling back: dropping fragments table and time_slot_id column...');
    
    await pool.query(`DROP TABLE IF EXISTS fragments CASCADE`);
    
    await pool.query(`
      ALTER TABLE lecture 
      DROP COLUMN IF EXISTS time_slot_id
    `);
    
    console.log('[Migration] ✅ Rollback completed');
  } catch (err) {
    console.error('[Migration] ❌ Rollback failed:', err);
    throw err;
  }
};
