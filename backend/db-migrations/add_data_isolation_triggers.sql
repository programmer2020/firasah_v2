-- ==============================================================================
-- Data Isolation - Triggers for Automatic created_by Tracking
-- ==============================================================================

-- ==============================================================================
-- 1. Trigger for sound_files (ensure created_by is set)
-- ==============================================================================

CREATE OR REPLACE FUNCTION set_sound_files_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL OR NEW.created_by = 'system' THEN
    NEW.created_by := COALESCE(NEW.createdBy, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sound_files_created_by ON sound_files;
CREATE TRIGGER trigger_sound_files_created_by
BEFORE INSERT ON sound_files
FOR EACH ROW
EXECUTE FUNCTION set_sound_files_created_by();

-- ==============================================================================
-- 2. Trigger for lecture (inherit from sound_files)
-- ==============================================================================

CREATE OR REPLACE FUNCTION set_lecture_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.file_id IS NOT NULL THEN
    SELECT createdBy INTO NEW.created_by FROM sound_files WHERE file_id = NEW.file_id;
  END IF;
  NEW.created_by := COALESCE(NEW.created_by, 'system');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lecture_created_by ON lecture;
CREATE TRIGGER trigger_lecture_created_by
BEFORE INSERT ON lecture
FOR EACH ROW
EXECUTE FUNCTION set_lecture_created_by();

-- ==============================================================================
-- 3. Trigger for fragments (inherit from sound_files)
-- ==============================================================================

CREATE OR REPLACE FUNCTION set_fragments_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.file_id IS NOT NULL THEN
    SELECT createdBy INTO NEW.created_by FROM sound_files WHERE file_id = NEW.file_id;
  END IF;
  NEW.created_by := COALESCE(NEW.created_by, 'system');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fragments_created_by ON fragments;
CREATE TRIGGER trigger_fragments_created_by
BEFORE INSERT ON fragments
FOR EACH ROW
EXECUTE FUNCTION set_fragments_created_by();

-- ==============================================================================
-- 4. Trigger for evidences (inherit from sound_files)
-- ==============================================================================

CREATE OR REPLACE FUNCTION set_evidences_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.file_id IS NOT NULL THEN
    SELECT createdBy INTO NEW.created_by FROM sound_files WHERE file_id = NEW.file_id;
  END IF;
  NEW.created_by := COALESCE(NEW.created_by, 'system');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_evidences_created_by ON evidences;
CREATE TRIGGER trigger_evidences_created_by
BEFORE INSERT ON evidences
FOR EACH ROW
EXECUTE FUNCTION set_evidences_created_by();

-- ==============================================================================
-- Verify triggers are created
-- ==============================================================================

SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('sound_files', 'lecture', 'fragments', 'evidences')
ORDER BY event_object_table;
