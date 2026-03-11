/**
 * Migration: Add time_slot_id and slot_order columns to speech table if missing
 * Purpose: Track which timeslot each speech segment belongs to and its order
 */

import { getPool } from '../config/database.js';

export const up = async () => {
  try {
    const pool = getPool();
    
    // Check if columns already exist
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'speech' 
      AND column_name IN ('time_slot_id', 'slot_order')
    `);
    
    const existingCols = result.rows.map(r => r.column_name);
    
    // Add time_slot_id if missing
    if (!existingCols.includes('time_slot_id')) {
      console.log('[Migration] Adding time_slot_id column to speech table...');
      await pool.query(`
        ALTER TABLE speech 
        ADD COLUMN time_slot_id INTEGER,
        ADD CONSTRAINT fk_speech_timeslot
          FOREIGN KEY (time_slot_id)
          REFERENCES section_time_slots(time_slot_id)
          ON DELETE SET NULL
      `);
      console.log('[Migration] ✅ time_slot_id column added');
    } else {
      console.log('[Migration] ℹ️  time_slot_id column already exists');
    }
    
    // Add slot_order if missing
    if (!existingCols.includes('slot_order')) {
      console.log('[Migration] Adding slot_order column to speech table...');
      await pool.query(`
        ALTER TABLE speech 
        ADD COLUMN slot_order INTEGER DEFAULT 0
      `);
      console.log('[Migration] ✅ slot_order column added');
    } else {
      console.log('[Migration] ℹ️  slot_order column already exists');
    }
    
    console.log('[Migration] ✅ Migration completed successfully');
  } catch (err) {
    console.error('[Migration] ❌ Migration failed:', err);
    throw err;
  }
};

export const down = async () => {
  try {
    const pool = getPool();
    
    console.log('[Migration] Rolling back: removing time_slot_id and slot_order columns...');
    await pool.query(`
      ALTER TABLE speech 
      DROP CONSTRAINT IF EXISTS fk_speech_timeslot,
      DROP COLUMN IF EXISTS time_slot_id,
      DROP COLUMN IF EXISTS slot_order
    `);
    console.log('[Migration] ✅ Rollback completed');
  } catch (err) {
    console.error('[Migration] ❌ Rollback failed:', err);
    throw err;
  }
};
