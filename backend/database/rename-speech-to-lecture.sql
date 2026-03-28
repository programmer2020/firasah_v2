-- Rename speech table to lecture
-- This migration updates the database schema to use 'lecture' instead of 'speech'

BEGIN TRANSACTION;

-- Check if 'speech' table exists and rename it to 'lecture'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'speech'
    ) THEN
        -- Drop any existing 'lecture' table if it exists (shouldn't normally happen)
        DROP TABLE IF EXISTS lecture CASCADE;
        
        -- Rename 'speech' to 'lecture'
        ALTER TABLE speech RENAME TO lecture;
        
        -- Rename indexes
        ALTER INDEX IF EXISTS idx_speech_file_id RENAME TO idx_lecture_file_id;
        ALTER INDEX IF EXISTS idx_speech_time_slot_id RENAME TO idx_lecture_time_slot_id;
        
        RAISE NOTICE 'Successfully renamed speech table to lecture';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'lecture'
    ) THEN
        RAISE NOTICE 'lecture table already exists - no action needed';
    ELSE
        RAISE WARNING 'Neither speech nor lecture table found';
    END IF;
END
$$;

COMMIT;
