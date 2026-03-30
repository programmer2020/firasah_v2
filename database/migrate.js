const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '',
  database: 'firasah_ai_db',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting database migration...\n');
    
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
    console.log('✅ Index on sound_files.filename created');
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sound_files_createdby ON sound_files(createdBy);`);
    console.log('✅ Index on sound_files.createdBy created');
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_kpis_kpi_name ON kpis(kpi_name);`);
    console.log('✅ Index on kpis.kpi_name created');
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_kpis_createdby ON kpis(createdBy);`);
    console.log('✅ Index on kpis.createdBy created');

    console.log('\n✨ Database migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
