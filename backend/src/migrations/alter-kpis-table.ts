import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'firasah_db',
});

async function alterTable() {
  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    console.log('\n📝 Altering kpis table structure...');

    // Add domain_id column
    try {
      console.log('▶️  Adding domain_id column to kpis table...');
      await client.query(`ALTER TABLE kpis ADD COLUMN domain_id INTEGER REFERENCES domains(domain_id) ON DELETE CASCADE;`);
      console.log('   ✅ domain_id column added');
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        console.log('   ⚠️  domain_id column already exists');
      } else {
        throw err;
      }
    }

    // Add kpi_code column
    try {
      console.log('▶️  Adding kpi_code column to kpis table...');
      await client.query(`ALTER TABLE kpis ADD COLUMN kpi_code VARCHAR(20);`);
      console.log('   ✅ kpi_code column added');
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        console.log('   ⚠️  kpi_code column already exists');
      } else {
        throw err;
      }
    }

    // Add kpi_description column
    try {
      console.log('▶️  Adding kpi_description column to kpis table...');
      await client.query(`ALTER TABLE kpis ADD COLUMN kpi_description TEXT;`);
      console.log('   ✅ kpi_description column added');
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        console.log('   ⚠️  kpi_description column already exists');
      } else {
        throw err;
      }
    }

    // Add unique constraint on kpi_code
    try {
      console.log('▶️  Adding UNIQUE constraint on kpi_code...');
      await client.query(`ALTER TABLE kpis ADD CONSTRAINT uq_kpi_code UNIQUE (kpi_code);`);
      console.log('   ✅ Unique constraint added');
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        console.log('   ⚠️  Unique constraint already exists');
      } else {
        throw err;
      }
    }

    console.log('\n✨ KPIs table structure updated successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

alterTable();
