-- ===============================================================================
-- حذف جميع البيانات القديمة - Cleanup Script
-- ===============================================================================

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

-- تأكيد النتيجة
SELECT 'Data cleanup completed successfully!' as status;
