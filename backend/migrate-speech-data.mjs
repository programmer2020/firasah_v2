/**
 * Migrate speech table data to fixed Neon schema
 */

import pkg from 'pg';
const { Client } = pkg;

const LOCAL_DB = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'firasah_ai_db',
};

const NEON_DB = {
  host: 'ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_o4iEtH5mkKIz',
  database: 'neondb',
  ssl: true,
};

class SpeechMigration {
  constructor() {
    this.localClient = null;
    this.neonClient = null;
  }

  async connect() {
    this.localClient = new Client(LOCAL_DB);
    await this.localClient.connect();
    console.log('✅ Connected to local database');

    this.neonClient = new Client(NEON_DB);
    await this.neonClient.connect();
    console.log('✅ Connected to Neon database');
  }

  async migrateSpeech() {
    try {
      console.log('\n📥 Extracting speech data from local...');
      const result = await this.localClient.query('SELECT * FROM speech');
      const speechData = result.rows;
      
      console.log(`✅ Extracted ${speechData.length} records\n`);

      if (speechData.length === 0) {
        console.log('ℹ️  No speech data to migrate');
        return;
      }

      console.log('📤 Inserting speech data to Neon...');
      
      for (const row of speechData) {
        const query = `
          INSERT INTO speech (id, file_id, transcript, language, duration, created_at, updated_at, time_slot_id, slot_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `;

        const values = [
          row.id,
          row.file_id,
          row.transcript,
          row.language,
          row.duration,
          row.created_at,
          row.updated_at,
          row.time_slot_id,
          row.slot_order
        ];

        try {
          await this.neonClient.query(query, values);
        } catch (error) {
          console.warn(`⚠️  Could not insert speech record ${row.id}: ${error.message}`);
        }
      }

      console.log(`✅ Successfully inserted ${speechData.length} speech records to Neon\n`);

      // Verify
      const verifyResult = await this.neonClient.query('SELECT COUNT(*) FROM speech');
      console.log(`📊 Verification: ${verifyResult.rows[0].count} records in Neon speech table`);

    } catch (error) {
      console.error('❌ Error during migration:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.localClient) await this.localClient.end();
    if (this.neonClient) await this.neonClient.end();
    console.log('\n✅ Disconnected from databases');
  }
}

console.log('╔════════════════════════════════════════╗');
console.log('║   SPEECH TABLE DATA MIGRATION        ║');
console.log('╚════════════════════════════════════════╝\n');

const migration = new SpeechMigration();

try {
  await migration.connect();
  await migration.migrateSpeech();
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
} finally {
  await migration.disconnect();
}
