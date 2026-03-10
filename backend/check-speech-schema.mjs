import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'firasah_ai_db'
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
