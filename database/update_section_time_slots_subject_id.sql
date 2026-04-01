BEGIN;

ALTER TABLE IF EXISTS section_time_slots
  ADD COLUMN IF NOT EXISTS subject_id INTEGER;

-- (Removed) syncing subject_id from class_schedule — table dropped; use migrate_drop_class_schedule.sql for upgrades.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM section_time_slots
    WHERE subject_id IS NULL
  ) THEN
    ALTER TABLE section_time_slots
      ALTER COLUMN subject_id SET NOT NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS section_time_slots
  DROP COLUMN IF EXISTS slot_date;

COMMIT;
