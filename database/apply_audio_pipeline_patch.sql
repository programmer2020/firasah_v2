-- Audio pipeline alignment patch
-- 1) sound_files gets aggregated transcript fields
ALTER TABLE IF EXISTS sound_files
  ADD COLUMN IF NOT EXISTS transcript TEXT COLLATE "C",
  ADD COLUMN IF NOT EXISTS transcript_language VARCHAR(10) COLLATE "C",
  ADD COLUMN IF NOT EXISTS transcript_updated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS class_id INTEGER,
  ADD COLUMN IF NOT EXISTS day_of_week VARCHAR(10) COLLATE "C",
  ADD COLUMN IF NOT EXISTS slot_date DATE;

-- 2) fragments table gets normalized fragment columns expected by the pipeline
ALTER TABLE IF EXISTS fragments
  ADD COLUMN IF NOT EXISTS lecture_id INTEGER REFERENCES lecture(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS time_slot_id INTEGER REFERENCES section_time_slots(time_slot_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fragment_order INTEGER,
  ADD COLUMN IF NOT EXISTS start_seconds DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS end_seconds DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS duration DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS fragment_path VARCHAR(500),
  ADD COLUMN IF NOT EXISTS transcript TEXT COLLATE "C",
  ADD COLUMN IF NOT EXISTS language VARCHAR(10),
  ADD COLUMN IF NOT EXISTS transcription_status VARCHAR(20) DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT COLLATE "C",
  ADD COLUMN IF NOT EXISTS last_transcription_attempt_at TIMESTAMP;

-- 3) Backfill normalized columns from older names if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fragments' AND column_name = 'slot_order'
  ) THEN
    EXECUTE 'UPDATE fragments SET fragment_order = COALESCE(fragment_order, slot_order)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fragments' AND column_name = 'start_time'
  ) THEN
    EXECUTE 'UPDATE fragments SET start_seconds = COALESCE(start_seconds, start_time)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fragments' AND column_name = 'end_time'
  ) THEN
    EXECUTE 'UPDATE fragments SET end_seconds = COALESCE(end_seconds, end_time)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fragments_file_id ON fragments(file_id);
CREATE INDEX IF NOT EXISTS idx_fragments_lecture_id ON fragments(lecture_id);
CREATE INDEX IF NOT EXISTS idx_fragments_time_slot_id ON fragments(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_fragments_order ON fragments(file_id, fragment_order);
