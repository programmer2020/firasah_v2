-- ==============================================================================
-- Data Isolation Migration
-- Add created_by columns to all relevant tables
-- ==============================================================================

-- 1. Add created_by to sound_files (already has this, but let's ensure)
ALTER TABLE sound_files
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system';

-- 2. Update existing records in sound_files to have created_by
UPDATE sound_files 
SET created_by = COALESCE(createdBy, 'system') 
WHERE created_by = 'system';

-- ==============================================================================
-- Dashboard Tables - Add created_by tracking
-- ==============================================================================

-- 3. Add created_by to lecture table (if not exists)
ALTER TABLE lecture
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system';

-- 4. Update lecture records to link to sound_files creator
UPDATE lecture l
SET created_by = (
  SELECT COALESCE(sf.createdBy, 'system') 
  FROM sound_files sf 
  WHERE sf.file_id = l.file_id
  LIMIT 1
)
WHERE created_by = 'system' AND l.file_id IS NOT NULL;

-- ==============================================================================
-- Fragments - Link to creator via sound_files
-- ==============================================================================

-- 5. Add created_by to fragments table
ALTER TABLE fragments
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system';

-- 6. Update fragments to have creator info
UPDATE fragments f
SET created_by = (
  SELECT COALESCE(sf.createdBy, 'system') 
  FROM sound_files sf 
  WHERE sf.file_id = f.file_id
  LIMIT 1
)
WHERE created_by = 'system' AND f.file_id IS NOT NULL;

-- ==============================================================================
-- Evidences - Link to creator via file
-- ==============================================================================

-- 7. Add created_by to evidences table
ALTER TABLE evidences
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system';

-- 8. Update evidences to have creator info
UPDATE evidences e
SET created_by = (
  SELECT COALESCE(sf.createdBy, 'system') 
  FROM sound_files sf 
  WHERE sf.file_id = e.file_id
  LIMIT 1
)
WHERE created_by = 'system' AND e.file_id IS NOT NULL;

-- ==============================================================================
-- Create or update views to include created_by
-- ==============================================================================

-- 9. Recreate dashboard_fact_lectures view with created_by
DROP MATERIALIZED VIEW IF EXISTS dashboard_fact_lectures CASCADE;

CREATE MATERIALIZED VIEW dashboard_fact_lectures AS
SELECT
  l.lecture_id,
  l.file_id,
  sf.createdBy::varchar(255) AS created_by,
  l.subject_id,
  l.teacher_id,
  t.teacher_name,
  l.section_id,
  sec.section_name,
  l.kpi_id,
  k.kpi_name,
  k.domain_id,
  d.domain_name,
  l.grade_id,
  g.grade_name,
  COALESCE(e.avg_score, 0) AS score,
  l.created_at,
  DATE_TRUNC('week', l.created_at)::date AS week_start,
  EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 86400 AS days_since_creation
FROM lecture l
INNER JOIN sound_files sf ON l.file_id = sf.file_id
LEFT JOIN teachers t ON l.teacher_id = t.teacher_id
LEFT JOIN sections sec ON l.section_id = sec.section_id
LEFT JOIN kpis k ON l.kpi_id = k.kpi_id
LEFT JOIN domains d ON k.domain_id = d.domain_id
LEFT JOIN grades g ON l.grade_id = g.grade_id
LEFT JOIN (
  SELECT lecture_id, AVG(COALESCE(score, 0)) AS avg_score
  FROM evaluations
  GROUP BY lecture_id
) e ON l.lecture_id = e.lecture_id;

CREATE INDEX idx_dashboard_fact_lectures_created_by ON dashboard_fact_lectures(created_by);
CREATE INDEX idx_dashboard_fact_lectures_lecture_id ON dashboard_fact_lectures(lecture_id);

-- ==============================================================================
-- Create or update evidences view with created_by
-- ==============================================================================

-- 10. Recreate dashboard_fact_evidences view with created_by
DROP MATERIALIZED VIEW IF EXISTS dashboard_fact_evidences CASCADE;

CREATE MATERIALIZED VIEW dashboard_fact_evidences AS
SELECT
  ev.evidence_id,
  sf.createdBy::varchar(255) AS created_by,
  ev.lecture_id,
  ev.file_id,
  sf.filename,
  l.teacher_id,
  t.teacher_name,
  ev.kpi_id,
  k.kpi_name,
  k.domain_id,
  d.domain_name,
  l.section_id,
  sec.section_name,
  l.grade_id,
  COALESCE(ev.score, 0) AS score,
  COALESCE(ev.confidence, 0) AS confidence,
  ev.start_time,
  ev.end_time,
  ev.created_at,
  DATE_TRUNC('week', ev.created_at)::date AS week_start
FROM evidences ev
INNER JOIN sound_files sf ON ev.file_id = sf.file_id
INNER JOIN lecture l ON ev.lecture_id = l.lecture_id
LEFT JOIN teachers t ON l.teacher_id = t.teacher_id
LEFT JOIN kpis k ON ev.kpi_id = k.kpi_id
LEFT JOIN domains d ON k.domain_id = d.domain_id
LEFT JOIN sections sec ON l.section_id = sec.section_id;

CREATE INDEX idx_dashboard_fact_evidences_created_by ON dashboard_fact_evidences(created_by);
CREATE INDEX idx_dashboard_fact_evidences_evidence_id ON dashboard_fact_evidences(evidence_id);

-- ==============================================================================
-- Grant necessary permissions
-- ==============================================================================

GRANT SELECT ON dashboard_fact_lectures TO public;
GRANT SELECT ON dashboard_fact_evidences TO public;

-- ==============================================================================
-- Verify the changes
-- ==============================================================================

-- Check if all columns were added
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name = 'created_by'
ORDER BY table_name;
