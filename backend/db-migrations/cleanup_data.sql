-- ==============================================================================
-- Data Cleanup Script
-- تنظيف البيانات والتأكد من الفصل الصحيح
-- ==============================================================================

-- 👉 اختر ONE من الخيارات أدناه حسب احتياجك:

-- ==============================================================================
-- الخيار 1: تحديث البيانات القديمة (بدون حذف)
-- استخدم هذا إذا كنت تريد الاحتفاظ بالبيانات القديمة
-- ==============================================================================

-- أولاً: تأكد من وجود column created_by
ALTER TABLE sound_files ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE lecture ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE fragments ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- ثانياً: تحديث sound_files (الجدول الأساسي)
UPDATE sound_files 
SET created_by = createdBy 
WHERE created_by IS NULL AND createdBy IS NOT NULL;

-- ثالثاً: تحديث lecture ليحصل على created_by من sound_files
UPDATE lecture l
SET created_by = sf.createdBy
FROM sound_files sf
WHERE l.file_id = sf.file_id 
AND l.created_by IS NULL 
AND sf.createdBy IS NOT NULL;

-- رابعاً: تحديث fragments
UPDATE fragments f
SET created_by = sf.createdBy
FROM sound_files sf
WHERE f.file_id = sf.file_id 
AND f.created_by IS NULL 
AND sf.createdBy IS NOT NULL;

-- خامساً: تحديث evidences
UPDATE evidences e
SET created_by = sf.createdBy
FROM sound_files sf
WHERE e.file_id = sf.file_id 
AND e.created_by IS NULL 
AND sf.createdBy IS NOT NULL;

-- ==============================================================================
-- الخيار 2: حذف البيانات القديمة (الخيار الأفضل للـ "Zero Data")
-- استخدم هذا لحذف كل البيانات القديمة والبدء من الصفر
-- ==============================================================================

-- ⚠️ تحذير: هذا سيحذف جميع البيانات!
-- تأكد من النسخ الاحتياطية قبل الاستمرار

-- 1. حذف الـ Evidences
DELETE FROM evidences;

-- 2. حذف الـ Fragments
DELETE FROM fragments;

-- 3. حذف الـ Lectures
DELETE FROM lecture;

-- 4. حذف الـ Sound Files
DELETE FROM sound_files;

-- ==============================================================================
-- الخيار 3: نقل البيانات القديمة إلى نظام معين (Archive)
-- استخدم هذا إذا كنت تريد أرشفة البيانات القديمة
-- ==============================================================================

-- أولاً: إنشاء جداول archive
CREATE TABLE IF NOT EXISTS sound_files_archive AS 
SELECT * FROM sound_files WHERE created_by IS NULL OR created_by = 'system';

CREATE TABLE IF NOT EXISTS lecture_archive AS 
SELECT * FROM lecture WHERE created_by IS NULL OR created_by = 'system';

-- ثانياً: حذف البيانات المؤرشفة من الجداول الأصلية
DELETE FROM evidences WHERE lecture_id IN (
  SELECT lecture_id FROM lecture WHERE created_by IS NULL OR created_by = 'system'
);

DELETE FROM fragments WHERE file_id IN (
  SELECT file_id FROM sound_files WHERE created_by IS NULL OR created_by = 'system'
);

DELETE FROM lecture WHERE created_by IS NULL OR created_by = 'system';

DELETE FROM sound_files WHERE created_by IS NULL OR created_by = 'system';

-- ==============================================================================
-- التحقق من النتائج
-- ==============================================================================

-- افحص البيانات المتبقية
SELECT 'sound_files' as table_name, COUNT(*) as remaining FROM sound_files
UNION ALL
SELECT 'lecture', COUNT(*) FROM lecture
UNION ALL
SELECT 'fragments', COUNT(*) FROM fragments
UNION ALL
SELECT 'evidences', COUNT(*) FROM evidences;

-- افحص created_by الموجود
SELECT DISTINCT created_by FROM sound_files WHERE created_by IS NOT NULL;
SELECT DISTINCT created_by FROM lecture WHERE created_by IS NOT NULL;
