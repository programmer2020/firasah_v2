-- One-time backfill: mirror legacy columns into canonical fragment_order / start_seconds / end_seconds
-- Run after deploy if older rows still have NULLs in these columns.

UPDATE fragments
SET
  fragment_order = COALESCE(fragment_order, slot_order, 0),
  start_seconds = COALESCE(start_seconds, start_time),
  end_seconds = COALESCE(end_seconds, end_time),
  updated_at = NOW()
WHERE fragment_order IS NULL
   OR start_seconds IS NULL
   OR end_seconds IS NULL;

-- Optional: link lecture_id when a lecture row exists for the same file (first match)
UPDATE fragments f
SET lecture_id = l.lecture_id,
    updated_at = NOW()
FROM (
  SELECT DISTINCT ON (file_id) file_id, lecture_id
  FROM lecture
  ORDER BY file_id, lecture_id DESC
) l
WHERE f.file_id = l.file_id
  AND f.lecture_id IS NULL;
