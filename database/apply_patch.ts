import pool from '../backend/src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const applyPatch = async () => {
  try {
    console.log('🔄 جاري تطبيق التعديلات على قاعدة البيانات...');
    
    const sqlPath = path.resolve(__dirname, 'drop_fragment_id_from_evidences.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    await pool.query(sql);
    
    console.log('✅ تم تطبيق التعديلات (حذف عمود fragment_id من جدول evidences) بنجاح!');
  } catch (error) {
    console.error('❌ حدث خطأ أثناء تطبيق التعديلات:', error);
  } finally {
    process.exit(0);
  }
};

applyPatch();