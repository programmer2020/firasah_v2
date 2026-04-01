/**
 * Migration: Replace file_id with fragment_id in evidences table
 * Purpose: Link evidences directly to fragments instead of sound files
 */

import pool from '../src/config/database.js';

export const up = async () => {
  try {
    console.log('[Migration] Replacing file_id with fragment_id in evidences table...');
    
    // Add fragment_id column (nullable initially)
    const fragmentIdExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'evidences' AND column_name = 'fragment_id'
    `);
    
    if (fragmentIdExists.rows.length === 0) {
      console.log('[Migration] Adding fragment_id column...');
      await pool.query(`
        ALTER TABLE evidences 
        ADD COLUMN fragment_id INTEGER REFERENCES fragments(fragment_id) ON DELETE CASCADE
      `);
      console.log('[Migration] ✅ fragment_id column added');
    }
    
    // Remove the old file_id column if it exists
    const fileIdExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'evidences' AND column_name = 'file_id'
    `);
    
    if (fileIdExists.rows.length > 0) {
      console.log('[Migration] Dropping old file_id column and indexes...');
      
      // Drop indexes that reference file_id
      await pool.query(`DROP INDEX IF EXISTS idx_evidences_file_id`);
      await pool.query(`DROP INDEX IF EXISTS idx_evidences_file_kpi_iscalculated`);
      
      // Drop the column
      await pool.query(`
        ALTER TABLE evidences 
        DROP COLUMN file_id
      `);
      console.log('[Migration] ✅ file_id column dropped');
    }
    
    // Create new indexes for fragment_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_evidences_fragment_id ON evidences(fragment_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_evidences_fragment_kpi_iscalculated ON evidences(fragment_id, kpi_id, iscalculated)
    `);
    
    console.log('[Migration] ✅ Migration completed successfully');
  } catch (err) {
    console.error('[Migration] ❌ Migration failed:', err);
    throw err;
  }
};

export const down = async () => {
  try {
    console.log('[Migration] Rolling back: reverting to file_id in evidences table...');
    
    // Drop new indexes
    await pool.query(`DROP INDEX IF EXISTS idx_evidences_fragment_id`);
    await pool.query(`DROP INDEX IF EXISTS idx_evidences_fragment_kpi_iscalculated`);
    
    // Drop fragment_id column
    const fragmentIdExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'evidences' AND column_name = 'fragment_id'
    `);
    
    if (fragmentIdExists.rows.length > 0) {
      await pool.query(`
        ALTER TABLE evidences 
        DROP COLUMN fragment_id
      `);
    }
    
    // Recreate file_id column with original foreign key
    const fileIdExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'evidences' AND column_name = 'file_id'
    `);
    
    if (fileIdExists.rows.length === 0) {
      await pool.query(`
        ALTER TABLE evidences 
        ADD COLUMN file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE
      `);
      
      // Recreate old indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_evidences_file_id ON evidences(file_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_evidences_file_kpi_iscalculated ON evidences(file_id, kpi_id, iscalculated)
      `);
    }
    
    console.log('[Migration] ✅ Rollback completed');
  } catch (err) {
    console.error('[Migration] ❌ Rollback failed:', err);
    throw err;
  }
};
