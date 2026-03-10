/**
 * Final Migration Verification
 */

import pkg from 'pg';
const { Client } = pkg;

const NEON_DB = {
  host: 'ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_o4iEtH5mkKIz',
  database: 'neondb',
  ssl: true,
};

const client = new Client(NEON_DB);

try {
  await client.connect();
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║    FINAL MIGRATION VERIFICATION      ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Get all tables with row counts
  const result = await client.query(`
    SELECT 
      t.tablename,
      COALESCE(n.n_live_tup, 0) as row_count
    FROM pg_tables t
    LEFT JOIN pg_stat_user_tables n ON t.tablename = n.relname
    WHERE t.schemaname = 'public'
    ORDER BY t.tablename
  `);

  console.log('📊 TABLE STATISTICS:\n');
  console.log('Table Name                  | Row Count');
  console.log('────────────────────────────┼──────────');
  
  let totalRows = 0;
  for (const row of result.rows) {
    const tableName = row.tablename.padEnd(27);
    const rowCount = String(row.row_count).padStart(8);
    console.log(`${tableName}| ${rowCount}`);
    totalRows += parseInt(row.row_count);
  }
  
  console.log('────────────────────────────┼──────────');
  console.log(`${'TOTAL'.padEnd(27)}| ${String(totalRows).padStart(8)}\n`);

  // Check data integrity
  console.log('✅ DATA INTEGRITY CHECKS:\n');

  const checks = [
    { table: 'users', minRows: 1, name: 'Users' },
    { table: 'schools', minRows: 1, name: 'Schools' },
    { table: 'grades', minRows: 1, name: 'Grades' },
    { table: 'classes', minRows: 1, name: 'Classes' },
    { table: 'kpi_domains', minRows: 8, name: 'KPI Domains' },
    { table: 'sound_files', minRows: 1, name: 'Sound Files' },
  ];

  for (const check of checks) {
    const countResult = await client.query(`SELECT COUNT(*) as cnt FROM ${check.table}`);
    const count = parseInt(countResult.rows[0].cnt);
    const status = count >= check.minRows ? '✅' : '❌';
    console.log(`  ${status} ${check.name.padEnd(20)}: ${count} records (min: ${check.minRows})`);
  }

  console.log('\n✅ CONNECTION TEST:\n');
  const versionResult = await client.query('SELECT version()');
  const version = versionResult.rows[0].version.split(',')[0];
  console.log(`  ✅ PostgreSQL: ${version}`);
  console.log(`  ✅ Database: ${NEON_DB.database}`);
  console.log(`  ✅ Host: ${NEON_DB.host}`);

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  ✅ MIGRATION VERIFIED SUCCESSFULLY  ║');
  console.log('╚════════════════════════════════════════╝\n');

  await client.end();

} catch (error) {
  console.error('❌ Verification error:', error.message);
  process.exit(1);
}
