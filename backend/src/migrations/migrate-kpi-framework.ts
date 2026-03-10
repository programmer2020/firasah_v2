import { readFileSync } from 'fs';
import { join } from 'path';
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

async function runMigration() {
  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Read the SQL file
    const sqlPath = join(process.cwd(), '../database/add_kpi_domains.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('\n📝 Executing KPI domains migration...');
    
    // Split by semicolons to handle multiple statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        console.log(`\n▶️  Executing: ${statement.substring(0, 60)}...`);
        await client.query(statement);
        console.log(`   ✅ Success`);
      } catch (err: any) {
        // Ignore "already exists" errors for idempotent operations
        if (err.message.includes('already exists') || err.code === '42P07') {
          console.log(`   ⚠️  ${err.message.split('\n')[0]}`);
        } else {
          console.error(`   ❌ Error: ${err.message}`);
        }
      }
    }

    // Verify the data
    console.log('\n📊 Verification:');
    
    const domainCount = await client.query('SELECT COUNT(*) as count FROM kpi_domains');
    console.log(`   ✓ KPI Domains: ${domainCount.rows[0].count}`);

    const kpiCount = await client.query('SELECT COUNT(*) as count FROM kpis WHERE domain_id IS NOT NULL');
    console.log(`   ✓ KPIs with domains: ${kpiCount.rows[0].count}`);

    const domains = await client.query('SELECT domain_code, domain_name FROM kpi_domains ORDER BY sort_order');
    console.log('\n   Domains created:');
    domains.rows.forEach((row: any) => {
      console.log(`     • ${row.domain_code}: ${row.domain_name}`);
    });

    console.log('\n✨ KPI Framework migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
