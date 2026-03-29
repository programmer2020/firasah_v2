/**
 * Migration: Create fragments table
 * Stores audio fragments split by time slots (usually 15 min each)
 */

import { executeQuery } from '../helpers/database.js';

async function createFragmentsTable() {
  try {
    console.log('🔄 Creating fragments table...');

    // Create fragments table to store audio segments split by time slots
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS fragments (
        id SERIAL PRIMARY KEY,
        file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
        time_slot_id INTEGER REFERENCES section_time_slots(time_slot_id) ON DELETE SET NULL,
        transcript TEXT,
        language VARCHAR(10) DEFAULT 'ar',
        duration DECIMAL(10, 6),
        slot_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Fragments table created successfully');

    // Create indexes for better performance
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_fragments_file_id 
      ON fragments(file_id);
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_fragments_time_slot_id 
      ON fragments(time_slot_id);
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_fragments_slot_order 
      ON fragments(slot_order);
    `);

    console.log('✅ Created indexes for fragments table');

    console.log('✨ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

createFragmentsTable().catch(console.error);
