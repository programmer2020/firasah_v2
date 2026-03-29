import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'firasah_ai_db',
});

async function migrate() {
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
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
      )
    `);
    console.log('✅ kpis table created');

    // Create evidences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS evidences (
        id SERIAL PRIMARY KEY,
        kpi_id INTEGER NOT NULL REFERENCES kpis(kpi_id) ON DELETE CASCADE,
        file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        evidence_txt TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ evidences table created');

    // Create evaluations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id SERIAL PRIMARY KEY,
        file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
        kpi_id INTEGER NOT NULL REFERENCES kpis(kpi_id) ON DELETE CASCADE,
        evidence_count INTEGER DEFAULT 0,
        mark DECIMAL(5, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ evaluations table created');

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sound_files_filename ON sound_files(filename)`);
    console.log('✅ Index on sound_files.filename created');
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sound_files_createdby ON sound_files(createdBy)`);
    console.log('✅ Index on sound_files.createdBy created');
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_kpis_kpi_name ON kpis(kpi_name)`);
    console.log('✅ Index on kpis.kpi_name created');
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_kpis_createdby ON kpis(createdBy)`);
    console.log('✅ Index on kpis.createdBy created');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_evidences_kpi_id ON evidences(kpi_id)`);
    console.log('✅ Index on evidences.kpi_id created');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_evidences_file_id ON evidences(file_id)`);
    console.log('✅ Index on evidences.file_id created');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_evaluations_file_id ON evaluations(file_id)`);
    console.log('✅ Index on evaluations.file_id created');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_evaluations_kpi_id ON evaluations(kpi_id)`);
    console.log('✅ Index on evaluations.kpi_id created');

    console.log('\n✨ Database migration completed successfully!');
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
