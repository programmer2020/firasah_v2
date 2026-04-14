import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'firasah_v2',
  ssl: {
    rejectUnauthorized: false
  }
});

async function cleanupDatabase() {
  try {
    console.log('🔗 جارٍ الاتصال بقاعدة البيانات...');
    await client.connect();
    console.log('✅ تم الاتصال بنجاح');

    console.log('\n🗑️  جارٍ حذف البيانات القديمة...');
    
    // حذف البيانات بترتيب يحترم الـ Foreign Keys
    await client.query('DELETE FROM evidences');
    console.log('✓ تم حذف evidences');
    
    await client.query('DELETE FROM fragments');
    console.log('✓ تم حذف fragments');
    
    await client.query('DELETE FROM lecture');
    console.log('✓ تم حذف lecture');
    
    await client.query('DELETE FROM sound_files');
    console.log('✓ تم حذف sound_files');

    console.log('\n📊 التحقق من النتيجة:');
    const tables = ['sound_files', 'lecture', 'fragments', 'evidences'];
    
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  • ${table}: ${result.rows[0].count} records`);
    }

    console.log('\n✅ تم تنظيف قاعدة البيانات بنجاح!');
    console.log('🎉 النظام جاهز للبدء الجديد\n');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanupDatabase();
