/**
 * Seed Script - Insert Sample Users with Hashed Passwords
 * شغّل هذا السكريبت لإضافة بيانات المستخدمين للاختبار
 */

import pool from './src/config/database.js';
import { hashPassword } from './src/services/authService.js';

const seedUsers = async () => {
  try {
    console.log('🌱 بدء إضافة بيانات المستخدمين...');
    console.log('🌱 Starting user seed process...\n');

    const sampleUsers = [
      {
        email: 'admin@test.com',
        password: 'Admin@12345',
        name: 'Admin User',
      },
      {
        email: 'teacher@test.com',
        password: 'Teacher@12345',
        name: 'Ahmed Al-Harbi',
      },
      {
        email: 'student@test.com',
        password: 'Student@12345',
        name: 'Student User',
      },
      {
        email: 'user@example.com',
        password: 'SecurePassword123!',
        name: 'Test User',
      },
    ];

    // فحص البيانات الموجودة
    const existingUsers = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(existingUsers.rows[0].count, 10);

    if (userCount > 0) {
      console.log(`⚠️  يوجد ${userCount} مستخدم موجود بالفعل`);
      console.log(`⚠️  ${userCount} users already exist\n`);
      
      // اعرض المستخدمين الموجودين
      const users = await pool.query('SELECT id, email, name FROM users');
      console.log('📋 المستخدمون الموجودون:');
      console.log('📋 Existing users:\n');
      users.rows.forEach((user) => {
        console.log(`   ✓ ${user.email} (${user.name})`);
      });
      console.log('\n');
      return;
    }

    // إضافة المستخدمين الجدد
    for (const user of sampleUsers) {
      const hashedPassword = await hashPassword(user.password);

      await pool.query(
        'INSERT INTO users (email, password, name, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        [user.email, hashedPassword, user.name]
      );

      console.log(`✅ تم إضافة: ${user.email}`);
      console.log(`✅ Added: ${user.email}`);
    }

    console.log('\n✨ اكتمل إضافة البيانات بنجاح!');
    console.log('✨ User seed completed successfully!\n');

    // اعرض بيانات تسجيل الدخول
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 بيانات تسجيل الدخول / Login Credentials:');
    console.log('═══════════════════════════════════════════════════════\n');

    sampleUsers.forEach((user) => {
      console.log(`📧 البريد / Email: ${user.email}`);
      console.log(`🔑 كلمة المرور / Password: ${user.password}`);
      console.log(`👤 الاسم / Name: ${user.name}\n`);
    });

    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ / Error:', error);
    process.exit(1);
  }
};

seedUsers();
