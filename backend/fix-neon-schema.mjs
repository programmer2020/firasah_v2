/**
 * Fix Neon lecture table schema - add missing columns
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
  console.log('🔧 Connected to Neon database');

  // Add missing columns to lecture table
  console.log('\n📝 Adding missing columns to lecture table...');
  
  // Check if columns exist first
  const checkResult = await client.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_name = 'lecture' AND column_name IN ('time_slot_id', 'slot_order')`
  );
  
  const existingCols = checkResult.rows.map(r => r.column_name);
  
  // Add time_slot_id if missing
  if (!existingCols.includes('time_slot_id')) {
    await client.query('ALTER TABLE lecture ADD COLUMN time_slot_id INTEGER');
    console.log('   ✅ Added time_slot_id column');
  } else {
    console.log('   ℹ️  time_slot_id already exists');
  }
  
  // Add slot_order if missing
  if (!existingCols.includes('slot_order')) {
    await client.query('ALTER TABLE lecture ADD COLUMN slot_order INTEGER');
    console.log('   ✅ Added slot_order column');
  } else {
    console.log('   ℹ️  slot_order already exists');
  }

  console.log('\n🔧 Neon lecture table schema has been fixed!');
  await client.end();
  console.log('✅ Done');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
