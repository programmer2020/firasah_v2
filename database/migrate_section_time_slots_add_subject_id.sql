-- Add subject_id to section_time_slots (existing DBs) with FK to subjects.
-- Backfills NULL rows using a deterministic spread over subjects.subject_id.

BEGIN;

ALTER TABLE IF EXISTS section_time_slots
  ADD COLUMN IF NOT EXISTS subject_id INTEGER;

UPDATE section_time_slots ts
SET subject_id = (
  SELECT s.subject_id
  FROM subjects s
  ORDER BY s.subject_id
  OFFSET (
    abs(hashtext(ts.time_slot_id::text || ':' || ts.class_id::text))
    % GREATEST((SELECT COUNT(*)::int FROM subjects), 1)
  )
  LIMIT 1
)
WHERE ts.subject_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_timeslot_subject'
      AND conrelid = 'section_time_slots'::regclass
  ) THEN
    ALTER TABLE section_time_slots
      ADD CONSTRAINT fk_timeslot_subject
      FOREIGN KEY (subject_id)
      REFERENCES subjects(subject_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_section_time_slots_subject_id
  ON section_time_slots(subject_id);

ALTER TABLE section_time_slots
  ALTER COLUMN subject_id SET NOT NULL;

COMMIT;
