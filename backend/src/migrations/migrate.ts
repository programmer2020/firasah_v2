import pool from '../src/config/database.js';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting database migration...');
    
    // Create sound_files table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sound_files (
        file_id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        filepath VARCHAR(500) NOT NULL,
        createdBy VARCHAR(255),
        note TEXT,
        transcript TEXT,
        transcript_language VARCHAR(10),
        transcript_updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ sound_files table created');

    // Create kpis table
    await client.query(`
      CREATE TABLE IF NOT EXISTS kpis (
        kpi_id SERIAL PRIMARY KEY,
        kpi_name VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        createdBy VARCHAR(255),
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ kpis table created');

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sound_files_filename ON sound_files(filename);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sound_files_createdby ON sound_files(createdBy);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_kpis_kpi_name ON kpis(kpi_name);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_kpis_createdby ON kpis(createdBy);`);
    console.log('✅ Indexes created');

    console.log('\n✨ Database migration completed successfully!');
  } catch (err: any) {
    console.error('❌ Migration failed:', err?.message || err);
    throw err;
  } finally {
    client.release();
  }
}

runMigration().catch((err: any) => {
  console.error('Error:', err);
  process.exit(1);
});
