import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rows = fs.readFileSync(path.join(__dirname, "_slot_rows.txt"), "utf8").trim();

const sql = `-- Full weekly grids (Sunday–Thursday) for sample classes 1–3.
-- Each day: seven 45-minute periods with breaks after period 3 (9:15–9:30) and after period 6 (11:45–12:00).
-- Periods: 7:00–7:45, 7:45–8:30, 8:30–9:15, 9:30–10:15, 10:15–11:00, 11:00–11:45, 12:00–12:45.
--
-- Expects classes (class_id) 1, 2, 3 from sample seed (e.g. Grade 6A, 6B, 5A).
-- Removes existing slots for those classes only, then re-inserts (subject + teacher on each row).

BEGIN;

DELETE FROM section_time_slots WHERE class_id IN (1, 2, 3);

SELECT setval(
  pg_get_serial_sequence('section_time_slots', 'time_slot_id'),
  GREATEST(COALESCE((SELECT MAX(time_slot_id) FROM section_time_slots), 0), 1),
  (SELECT COUNT(*) > 0 FROM section_time_slots)
);

INSERT INTO section_time_slots (class_id, subject_id, teacher_id, day_of_week, start_time, end_time)
VALUES
${rows};

COMMIT;
`;

fs.writeFileSync(path.join(__dirname, "seed_section_time_slots_three_classes.sql"), sql, "utf8");
console.log("wrote seed_section_time_slots_three_classes.sql");
