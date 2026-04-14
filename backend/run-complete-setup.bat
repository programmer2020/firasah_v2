@echo off
REM ===============================================================================
REM Firasah V2 - Complete Data Isolation & System Restart Script
REM تشغيل النظام بكامله مع عزل البيانات
REM ===============================================================================

echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║         Firasah V2 - Complete Data Isolation & System Restart             ║
echo ║          تشغيل النظام بكامله مع عزل البيانات الكامل بين المستخدمين      ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.

REM Set environment
cd /d "%~dp0"
cd ..

echo [1/6] 📋 جارٍ التحقق من البيئة...
if not exist package.json (
    echo ❌ خطأ: لم يتم العثور على package.json
    pause
    exit /b 1
)

echo [2/6] 📦 جارٍ تثبيت الحزم (إن لزم)...
call npm install
if %errorlevel% neq 0 (
    echo ❌ فشل تثبيت الحزم
    pause
    exit /b 1
)

echo [3/6] 🔨 جارٍ بناء TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ فشل البناء
    pause
    exit /b 1
)
echo ✅ تم البناء بنجاح

echo.
echo [4/6] 🗄️ جارٍ تنفيذ Database Migrations...
echo.
echo اختر أحد الخيارات:
echo 1. حذف جميع البيانات القديمة (الاختيار الأفضل للـ "Zero Data")
echo 2. تحديث البيانات القديمة مع الاحتفاظ بها
echo 3. تخطي الـ Migration (سوف تعمل بالبيانات الحالية)
echo.
set /p choice="اختر (1/2/3): "

if "%choice%"=="1" (
    echo.
    echo ⚠️  تحذير: سيتم حذف جميع البيانات!
    set /p confirm="هل متأكد؟ (y/n): "
    if /i "%confirm%"=="y" (
        psql -h %DB_HOST% -U %DB_USER% -d %DB_NAME% -f "db-migrations/cleanup_data.sql"
        if %errorlevel% neq 0 (
            echo ❌ فشل تنفيذ الـ Migration
            pause
            exit /b 1
        )
        echo ✅ تم حذف البيانات بنجاح
    ) else (
        echo تم الإلغاء
    )
) else if "%choice%"=="2" (
    echo جارٍ تحديث البيانات...
    psql -h %DB_HOST% -U %DB_USER% -d %DB_NAME% -f "db-migrations/IMPLEMENTATION_STEPS.sql"
    if %errorlevel% neq 0 (
        echo ❌ فشل تنفيذ الـ Migration
        pause
        exit /b 1
    )
    echo ✅ تم تحديث البيانات بنجاح
) else (
    echo تم تخطي الـ Migration
)

echo.
echo [5/6] 🚀 جارٍ تشغيل Backend Server...
REM افتح نافذة جديدة للـ Backend
start "Firasah Backend Server" cmd /k npm run dev

timeout /t 3 /nobreak
echo ✅ تم تشغيل Backend

echo.
echo [6/6] 🎨 جارٍ تشغيل Frontend...
REM افتح نافذة جديدة للـ Frontend
cd ../frontend
start "Firasah Frontend" cmd /k npm start

echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║                    ✅ تم تشغيل النظام بنجاح!                             ║
echo ║                                                                           ║
echo ║  Backend  → http://localhost:5000 (in new window)                         ║
echo ║  Frontend → http://localhost:3000 (in new window)                         ║
echo ║                                                                           ║
echo ║  اختبر الآن:                                                             ║
echo ║  1. أنشئ مستخدم normal_user جديد                                        ║
echo ║  2. تحقق من أنه لا يرى أي بيانات قديمة                                   ║
echo ║  3. ارفع ملف جديد                                                        ║
echo ║  4. تحقق من ظهوره في الـ Dashboard                                       ║
echo ║                                                                           ║
echo ║  ملاحظة: قد تستغرق التطبيقات بضع ثوانٍ للتشغيل الكامل                    ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo اضغط أي مفتاح لإغلاق هذه النافذة...
pause
