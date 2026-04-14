-- ==============================================================================
-- COMPLETE DATA ISOLATION IMPLEMENTATION GUIDE
-- دليل شامل لتنفيذ عزل البيانات الكامل
-- ==============================================================================

-- ==============================================================================
-- STEP 1: التحقق من الحالة الحالية
-- ==============================================================================

-- هل تم تنفيذ الـ Migration السابقة؟
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('sound_files', 'lecture', 'fragments', 'evidences')
ORDER BY table_name, ordinal_position;

-- كم عدد البيانات الحالية؟
SELECT 
    'sound_files' as table_name, COUNT(*) as total, 
    COUNT(CASE WHEN created_by IS NULL THEN 1 END) as null_created_by
FROM sound_files
UNION ALL
SELECT 'lecture', COUNT(*), COUNT(CASE WHEN created_by IS NULL THEN 1 END) FROM lecture
UNION ALL
SELECT 'fragments', COUNT(*), COUNT(CASE WHEN created_by IS NULL THEN 1 END) FROM fragments
UNION ALL
SELECT 'evidences', COUNT(*), COUNT(CASE WHEN created_by IS NULL THEN 1 END) FROM evidences;

-- ==============================================================================
-- STEP 2: اختر إحدى الاستراتيجيات
-- ==============================================================================

-- ============= STRATEGY A: حذف كل البيانات (الاختيار الأفضل للـ "Zero Data") =============
DELETE FROM evidences;
DELETE FROM fragments;
DELETE FROM lecture;
DELETE FROM sound_files;

-- ============= STRATEGY B: تحديث البيانات القديمة =============
-- استخدم هذا إذا كنت تريد الاحتفاظ ببيانات الكثير من المستخدمين

-- تحديث sound_files
UPDATE sound_files SET created_by = createdBy WHERE created_by IS NULL AND createdBy IS NOT NULL;

-- تحديث lecture
UPDATE lecture l SET created_by = sf.createdBy
FROM sound_files sf
WHERE l.file_id = sf.file_id AND l.created_by IS NULL;

-- تحديث fragments
UPDATE fragments f SET created_by = sf.createdBy
FROM sound_files sf
WHERE f.file_id = sf.file_id AND f.created_by IS NULL;

-- تحديث evidences
UPDATE evidences e SET created_by = sf.createdBy
FROM sound_files sf
WHERE e.file_id = sf.file_id AND e.created_by IS NULL;

-- ==============================================================================
-- STEP 3: إنشء Triggers لضمان عزل البيانات تلقائياً للبيانات الجديدة
-- ==============================================================================

-- 1. Sound Files Trigger (إذا أضفنا created_by للـ table)
CREATE OR REPLACE TRIGGER set_soundfile_created_by
BEFORE INSERT ON sound_files
FOR EACH ROW
WHEN (NEW.created_by IS NULL)
EXECUTE FUNCTION set_created_by_from_user();

-- 2. Lecture Trigger
CREATE OR REPLACE TRIGGER set_lecture_created_by
BEFORE INSERT ON lecture
FOR EACH ROW
EXECUTE FUNCTION set_created_by_from_soundfile();

-- 3. Fragments Trigger
CREATE OR REPLACE TRIGGER set_fragments_created_by
BEFORE INSERT ON fragments
FOR EACH ROW
EXECUTE FUNCTION set_created_by_from_soundfile();

-- 4. Evidences Trigger
CREATE OR REPLACE TRIGGER set_evidences_created_by
BEFORE INSERT ON evidences
FOR EACH ROW
EXECUTE FUNCTION set_created_by_from_soundfile();

-- ==============================================================================
-- STEP 4: إعادة إنشاء Materalized Views بـ created_by
-- ==============================================================================

-- احذف الـ Views القديمة
DROP MATERIALIZED VIEW IF EXISTS dashboard_fact_lectures CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboard_fact_evidences CASCADE;

-- أنشئ views جديدة بـ created_by
CREATE MATERIALIZED VIEW dashboard_fact_lectures AS
SELECT 
    l.lecture_id,
    l.file_id,
    l.created_by,
    l.lecture_name,
    l.domain,
    l.subject,
    WEEK(l.week_num) as week_number,
    l.teacher,
    l.classroom,
    l.duration_minutes,
    l.created_at
FROM lecture l
WHERE l.created_by IS NOT NULL;

CREATE MATERIALIZED VIEW dashboard_fact_evidences AS
SELECT 
    e.evidence_id,
    e.file_id,
    e.created_by,
    e.description,
    e.evidence_type,
    e.domain,
    e.sub_domain,
    e.start_time,
    e.duration_seconds,
    e.created_at
FROM evidences e
WHERE e.created_by IS NOT NULL;

-- ==============================================================================
-- STEP 5: التحقق الأخير
-- ==============================================================================

-- تأكد من البيانات
SELECT COUNT(*) FROM sound_files WHERE created_by IS NULL;
SELECT COUNT(*) FROM lecture WHERE created_by IS NULL;
SELECT COUNT(*) FROM fragments WHERE created_by IS NULL;
SELECT COUNT(*) FROM evidences WHERE created_by IS NULL;

-- تأكد من وجود البيانات للمستخدمين الفعليين
SELECT DISTINCT created_by FROM sound_files WHERE created_by IS NOT NULL;
SELECT DISTINCT created_by FROM lecture WHERE created_by IS NOT NULL;

-- عدد البيانات لكل مستخدم
SELECT created_by, COUNT(*) FROM sound_files GROUP BY created_by;
SELECT created_by, COUNT(*) FROM lecture GROUP BY created_by;
