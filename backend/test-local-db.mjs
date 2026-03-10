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
  console.log('✅ Local database connected!');
  
  const result = await client.query(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\''
  );
  
  console.log(`\n📊 Tables found: ${result.rows.length}\n`);
  result.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));
  
  await client.end();
  console.log('\n✅ Connection closed successfully');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
