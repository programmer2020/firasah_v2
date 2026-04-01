-- One-time migration: move teacher (and subject if missing) from class_schedule onto section_time_slots, then drop class_schedule.
-- Safe to run if class_schedule already dropped (skips copy).

BEGIN;

ALTER TABLE IF EXISTS section_time_slots
  ADD COLUMN IF NOT EXISTS teacher_id INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'class_schedule'
  ) THEN
    UPDATE section_time_slots ts
    SET
      teacher_id = COALESCE(ts.teacher_id, cs.teacher_id),
      subject_id = COALESCE(ts.subject_id, cs.subject_id)
    FROM class_schedule cs
    WHERE cs.time_slot_id = ts.time_slot_id;

    DROP TABLE IF EXISTS class_schedule;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_timeslot_teacher'
      AND conrelid = 'section_time_slots'::regclass
  ) THEN
    ALTER TABLE section_time_slots
      ADD CONSTRAINT fk_timeslot_teacher
      FOREIGN KEY (teacher_id)
      REFERENCES teachers(teacher_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_section_time_slots_teacher_id
  ON section_time_slots(teacher_id);

COMMIT;
