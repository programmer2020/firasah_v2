-- ============================================================
-- Patch: Replace file_id with lecture_id in evidences table
-- ============================================================

DO $$
BEGIN
    -- 1. Add lecture_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidences' AND column_name = 'lecture_id') THEN
        -- Check if lecture table uses 'id' or 'lecture_id' as Primary Key to avoid reference errors
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lecture' AND column_name = 'lecture_id') THEN
            ALTER TABLE evidences ADD COLUMN lecture_id INTEGER REFERENCES lecture(lecture_id) ON DELETE CASCADE;
        ELSE
            ALTER TABLE evidences ADD COLUMN lecture_id INTEGER REFERENCES lecture(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- 2. Drop file_id column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidences' AND column_name = 'file_id') THEN
        ALTER TABLE evidences DROP COLUMN file_id CASCADE;
    END IF;
END $$;

-- 3. Drop old indexes
DROP INDEX IF EXISTS idx_evidences_file_id;
DROP INDEX IF EXISTS idx_evidences_file_kpi_iscalculated;

-- 4. Create new indexes for lecture_id
CREATE INDEX IF NOT EXISTS idx_evidences_lecture_id ON evidences(lecture_id);
CREATE INDEX IF NOT EXISTS idx_evidences_lecture_kpi_iscalculated ON evidences(lecture_id, kpi_id, iscalculated);