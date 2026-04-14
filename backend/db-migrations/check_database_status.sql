-- قائمة فحص: التحقق من حالة قاعدة البيانات الحالية

-- 1️⃣ هل تم إضافة column created_by ؟
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'created_by'
ORDER BY table_name;

-- 2️⃣ ما هي الجداول وعددها؟
SELECT 'sound_files' as table_name, COUNT(*) as count FROM sound_files
UNION ALL
SELECT 'lecture', COUNT(*) FROM lecture
UNION ALL
SELECT 'fragments', COUNT(*) FROM fragments
UNION ALL
SELECT 'evidences', COUNT(*) FROM evidences;

-- 3️⃣ ما هي قيم created_by الموجودة؟
SELECT DISTINCT created_by FROM sound_files LIMIT 10;
SELECT DISTINCT created_by FROM lecture LIMIT 10;

-- 4️⃣ هل توجد NULL values؟
SELECT COUNT(*) as null_count FROM sound_files WHERE created_by IS NULL;
SELECT COUNT(*) as null_count FROM lecture WHERE created_by IS NULL;
SELECT COUNT(*) as null_count FROM fragments WHERE created_by IS NULL;
SELECT COUNT(*) as null_count FROM evidences WHERE created_by IS NULL;

-- 5️⃣ ما هي قيم createdBy الموجودة (من قبل الـ migration)؟
SELECT DISTINCT createdBy FROM sound_files LIMIT 10;
