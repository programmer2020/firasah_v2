-- Multi-Tenant Migration: Add user_id FK to all data tables
-- This ensures each user can only see their own data (unless super_admin)

-- 0. Prerequisites: ensure users table has user_id column and role column
-- Rename users.id → users.user_id if the column is still called 'id'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE users RENAME COLUMN id TO user_id;
    RAISE NOTICE 'Renamed users.id → users.user_id';
  END IF;
END $$;

-- Add role column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 1. Add user_id column to schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_schools_user_id ON schools(user_id);

-- 2. Add user_id column to teachers
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);

-- 3. Add user_id column to grades
ALTER TABLE grades ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_grades_user_id ON grades(user_id);

-- 4. Add user_id column to sections
ALTER TABLE sections ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sections_user_id ON sections(user_id);

-- 5. Add user_id column to classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);

-- 6. Add user_id column to subjects
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);

-- 7. Add user_id column to sound_files
ALTER TABLE sound_files ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sound_files_user_id ON sound_files(user_id);

-- 8. Add user_id column to section_time_slots
ALTER TABLE section_time_slots ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_section_time_slots_user_id ON section_time_slots(user_id);

-- 9. Backfill user_id in sound_files from existing createdby (email match)
UPDATE sound_files sf
SET user_id = u.user_id
FROM users u
WHERE sf.user_id IS NULL
  AND (LOWER(TRIM(sf.createdby)) = LOWER(TRIM(u.email))
       OR sf.createdby = CAST(u.user_id AS TEXT));
