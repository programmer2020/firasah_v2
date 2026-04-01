-- حذف عمود fragment_id وما يرتبط به من قيود (Foreign Keys)
ALTER TABLE public.evidences DROP COLUMN IF EXISTS fragment_id CASCADE;

-- حذف الفهارس (Indexes) المرتبطة بالعمود إذا كانت موجودة
DROP INDEX IF EXISTS idx_evidences_fragment_id;
DROP INDEX IF EXISTS idx_evidences_fragment_kpi_iscalculated;