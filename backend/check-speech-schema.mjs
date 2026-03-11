import pkg from 'pg';
const { Client } = pkg;

// Use environment variables or Neon Cloud config
const client = new Client({
  host: process.env.DB_HOST || 'ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'neondb_owner',
  password: process.env.DB_PASSWORD || 'npg_o4iEtH5mkKIz',
  database: process.env.DB_NAME || 'neondb',
  ssl: true
});

try {
  await client.connect();
  
  console.log('📋 LOCAL SPEECH TABLE SCHEMA:\n');
  const localResult = await client.query(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'speech' ORDER BY ordinal_position"
  );
  
  localResult.rows.forEach(row => {
    console.log(`   ${row.column_name.padEnd(20)} | ${row.data_type.padEnd(15)} | nullable: ${row.is_nullable}`);
  });
  
  console.log('\n📊 LOCAL SPEECH DATA:\n');
  const dataResult = await client.query('SELECT * FROM speech');
  console.log(`   Total records: ${dataResult.rows.length}`);
  if (dataResult.rows.length > 0) {
    console.log('\n   Column names in data:');
    Object.keys(dataResult.rows[0]).forEach(key => {
      console.log(`     - ${key}`);
    });
  }
  
  await client.end();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
