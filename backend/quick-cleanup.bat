@echo off
REM ===============================================================================
REM Quick Data Cleanup - حذف السريع للبيانات القديمة
REM ===============================================================================

echo.
echo 🔒 Firasah V2 - Quick Data Cleanup
echo جارِ حذف البيانات القديمة لبدء نظيف...
echo.

REM Set environment
cd /d "%~dp0"

REM Check if we're in backend directory
if not exist package.json (
    cd backend
)

REM Delete all old data
echo ⚠️  جارِ حذف جميع البيانات...
echo.

REM Using psql directly (make sure PostgreSQL is running)
psql -h localhost -U postgres -d firasah_v2 << EOF
-- حذف جميع البيانات
DELETE FROM evidences;
DELETE FROM fragments;
DELETE FROM lecture;
DELETE FROM sound_files;

-- التحقق من النتيجة
SELECT 'sound_files' as table_name, COUNT(*) as count FROM sound_files
UNION ALL
SELECT 'lecture', COUNT(*) FROM lecture
UNION ALL
SELECT 'fragments', COUNT(*) FROM fragments
UNION ALL
SELECT 'evidences', COUNT(*) FROM evidences;
EOF

if %errorlevel% neq 0 (
    echo ❌ فشل حذف البيانات
    echo.
    echo تأكد من:
    echo 1. PostgreSQL مفعل وتعمل
    echo 2. أنت في مجلد backend
    echo 3. قاعدة البيانات "firasah_v2" موجودة
    pause
    exit /b 1
)

echo.
echo ✅ تم حذف البيانات بنجاح!
echo.
echo الخطوة التالية:
echo 1. شغّل: npm run dev
echo 2. شغّل Frontend: cd ../frontend && npm start
echo 3. أنشئ مستخدم جديد وتحقق من أنه يرى صفر بيانات
echo.
pause
