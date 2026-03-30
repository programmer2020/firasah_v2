const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Neon Cloud Configuration (default)
const NEON_CONFIG = {
  host: 'ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_o4iEtH5mkKIz',
  database: 'neondb',
  ssl: {
    rejectUnauthorized: false,
  },
  client_encoding: 'UTF8',
};

// Local Database Configuration (fallback)
const LOCAL_CONFIG = {
  host: process.env.LOCAL_DB_HOST || 'localhost',
  port: parseInt(process.env.LOCAL_DB_PORT || '5432', 10),
  user: process.env.LOCAL_DB_USER || 'postgres',
  password: process.env.LOCAL_DB_PASSWORD || '',
  database: process.env.LOCAL_DB_NAME || 'firasah_ai_db',
  client_encoding: 'UTF8',
};

// Migration scripts in execution order
const MIGRATION_SCRIPTS = [
  'firasa_core_tables.sql',
  'create_users_table.sql',
  'create_fragments_table.sql',
  'create_speech_table.sql',
  'add_tables.sql',
  'add_kpi_domains.sql',
  'apply_audio_pipeline_patch.sql',
  'drop_createdat_from_sound_files.sql',
];

async function executeMigrations() {
  let pool;
  let client;

  try {
    // Try to connect to Neon first, fallback to local if fails
    console.log('🔄 Attempting to connect to Neon Cloud...');
    pool = new Pool(NEON_CONFIG);

    try {
      client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Connected to Neon Cloud\n');
    } catch (neonError) {
      console.log('⚠️  Neon connection failed, trying local database...');
      await pool.end();

      pool = new Pool(LOCAL_CONFIG);
      client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Connected to Local PostgreSQL\n');
    }

    // Execute each migration script
    for (const scriptName of MIGRATION_SCRIPTS) {
      const scriptPath = path.join(__dirname, scriptName);

      console.log(`📄 Reading: ${scriptName}`);
      const sqlContent = fs.readFileSync(scriptPath, 'utf8');

      client = await pool.connect();
      try {
        console.log(`⏳ Executing: ${scriptName}`);
        await client.query(sqlContent);
        console.log(`✅ ${scriptName} - SUCCESS\n`);
      } catch (error) {
        console.error(`❌ ${scriptName} - FAILED:`, error.message);
        // Don't throw, continue with next script
      } finally {
        client.release();
      }
    }

    console.log('\n✨ All migrations completed!');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

executeMigrations().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
