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

async function cleanupUserData() {
  try {
    console.log('🔗 جارٍ الاتصال بقاعدة البيانات...');
    await client.connect();
    console.log('✅ تم الاتصال بنجاح\n');

    console.log('📋 البيانات الثابتة (محفوظة):');
    
    const classes = await client.query('SELECT COUNT(*) as count FROM classes');
    console.log(`  ✓ classes: ${classes.rows[0].count}`);
    
    const sections = await client.query('SELECT COUNT(*) as count FROM sections');
    console.log(`  ✓ sections: ${sections.rows[0].count}`);
    
    const domains = await client.query('SELECT COUNT(*) as count FROM domains');
    console.log(`  ✓ domains: ${domains.rows[0].count}`);
    
    const subjects = await client.query('SELECT COUNT(*) as count FROM subjects');
    console.log(`  ✓ subjects: ${subjects.rows[0].count}`);
    
    const teachers = await client.query('SELECT COUNT(*) as count FROM teachers');
    console.log(`  ✓ teachers: ${teachers.rows[0].count}`);

    console.log('\n🗑️  جارٍ حذف بيانات المستخدمين فقط...\n');
    
    // حذف البيانات المستخدم بترتيب يحترم الـ Foreign Keys
    await client.query('DELETE FROM lecture_kpi');
    console.log('✓ تم حذف lecture_kpi');
    
    await client.query('DELETE FROM upload_logs');
    console.log('✓ تم حذف upload_logs');
    
    await client.query('DELETE FROM login_events');
    console.log('✓ تم حذف login_events');
    
    await client.query('DELETE FROM evidences');
    console.log('✓ تم حذف evidences');
    
    await client.query('DELETE FROM fragments');
    console.log('✓ تم حذف fragments');
    
    await client.query('DELETE FROM lecture');
    console.log('✓ تم حذف lecture');
    
    await client.query('DELETE FROM sound_files');
    console.log('✓ تم حذف sound_files');

    console.log('\n📊 التحقق من النتيجة:');
    const soundFiles = await client.query('SELECT COUNT(*) as count FROM sound_files');
    console.log(`  • sound_files: ${soundFiles.rows[0].count}`);
    
    const lecture = await client.query('SELECT COUNT(*) as count FROM lecture');
    console.log(`  • lecture: ${lecture.rows[0].count}`);
    
    const fragments = await client.query('SELECT COUNT(*) as count FROM fragments');
    console.log(`  • fragments: ${fragments.rows[0].count}`);
    
    const evidences = await client.query('SELECT COUNT(*) as count FROM evidences');
    console.log(`  • evidences: ${evidences.rows[0].count}`);

    console.log('\n✅ تم تنظيف بيانات المستخدمين بنجاح!');
    console.log('✅ البيانات الثابتة (classes, sections, domains, subjects, teachers) محفوظة');
    console.log('✅ section_time_slots و kpis محفوظة');
    console.log('🎉 النظام جاهز للبدء الجديد\n');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanupUserData();
