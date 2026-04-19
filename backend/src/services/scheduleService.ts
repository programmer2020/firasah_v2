/**
 * Schedule Service
 * Handles class schedule, time slots, and related lookups.
 * Teacher + subject live on section_time_slots (no class_schedule table).
 */

import { getMany, getOne, insert, executeQuery } from '../helpers/database.js';

// ── Lookups ─────────────────────────────────────────────

export const getAllClasses = async (userId?: number | null) => {
  if (userId) {
    const query = `
      SELECT c.class_id, c.class_name, c.grade_id, c.section_id,
             g.grade_name, s.section_name
      FROM classes c
      JOIN grades g ON c.grade_id = g.grade_id
      JOIN sections s ON c.section_id = s.section_id
      WHERE c.user_id = $1
      ORDER BY g.grade_level ASC, s.section_name ASC
    `;
    return await getMany(query, [userId]);
  }
  const query = `
    SELECT c.class_id, c.class_name, c.grade_id, c.section_id,
           g.grade_name, s.section_name
    FROM classes c
    JOIN grades g ON c.grade_id = g.grade_id
    JOIN sections s ON c.section_id = s.section_id
    ORDER BY g.grade_level ASC, s.section_name ASC
  `;
  return await getMany(query);
};

export const getAllTeachers = async (userId?: number | null) => {
  if (userId) {
    const query = `
      SELECT teacher_id, teacher_name, teacher_email
      FROM teachers
      WHERE user_id = $1
      ORDER BY teacher_name ASC
    `;
    return await getMany(query, [userId]);
  }
  const query = `
    SELECT teacher_id, teacher_name, teacher_email
    FROM teachers
    ORDER BY teacher_name ASC
  `;
  return await getMany(query);
};

export const getAllSubjects = async (userId?: number | null) => {
  if (userId) {
    const query = `
      SELECT subject_id, subject_name
      FROM subjects
      WHERE user_id = $1
      ORDER BY subject_name ASC
    `;
    return await getMany(query, [userId]);
  }
  const query = `
    SELECT subject_id, subject_name
    FROM subjects
    ORDER BY subject_name ASC
  `;
  return await getMany(query);
};

// ── Time Slots ──────────────────────────────────────────

export const getTimeSlotsByClass = async (classId: number) => {
  const query = `
    SELECT ts.time_slot_id, ts.class_id, ts.day_of_week, ts.subject_id,
           ts.teacher_id,
           ts.start_time::text, ts.end_time::text,
           sub.subject_name, t.teacher_name
    FROM section_time_slots ts
    LEFT JOIN subjects sub ON ts.subject_id = sub.subject_id
    LEFT JOIN teachers t ON ts.teacher_id = t.teacher_id
    WHERE ts.class_id = $1
    ORDER BY ts.day_of_week, ts.start_time ASC
  `;
  return await getMany(query, [classId]);
};

export const createTimeSlot = async (data: {
  class_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_id: number;
  teacher_id?: number | null;
  user_id?: number | null;
}) => {
  return await insert('section_time_slots', {
    class_id: data.class_id,
    day_of_week: data.day_of_week,
    start_time: data.start_time,
    end_time: data.end_time,
    subject_id: data.subject_id,
    teacher_id: data.teacher_id ?? null,
    user_id: data.user_id ?? null,
  });
};

export const deleteTimeSlot = async (timeSlotId: number) => {
  const result = await executeQuery(
    'DELETE FROM section_time_slots WHERE time_slot_id = $1 RETURNING *',
    [timeSlotId]
  );
  return result.rows[0] || null;
};

// ── Assign / update subject + teacher on a slot ────────

export const assignSchedule = async (data: {
  class_id: number;
  time_slot_id: number;
  subject_id: number;
  teacher_id: number;
}) => {
  const slot = await getOne(
    'SELECT time_slot_id FROM section_time_slots WHERE time_slot_id = $1 AND class_id = $2',
    [data.time_slot_id, data.class_id]
  );
  if (!slot) {
    throw new Error('Time slot not found for this class');
  }

  const result = await executeQuery(
    `UPDATE section_time_slots
     SET subject_id = $1, teacher_id = $2
     WHERE time_slot_id = $3 AND class_id = $4
     RETURNING *`,
    [data.subject_id, data.teacher_id, data.time_slot_id, data.class_id]
  );
  return result.rows[0];
};

/** Remove teacher assignment (teacher_id NULL); keeps subject/times on the slot */
export const removeSchedule = async (timeSlotId: number) => {
  const result = await executeQuery(
    `UPDATE section_time_slots
     SET teacher_id = NULL
     WHERE time_slot_id = $1
     RETURNING *`,
    [timeSlotId]
  );
  return result.rows[0] || null;
};

// ── Full schedule for a class ───────────────────────────

export const getFullSchedule = async (classId: number) => {
  const query = `
    SELECT
      ts.time_slot_id, ts.day_of_week, ts.subject_id, ts.teacher_id,
      ts.start_time::text, ts.end_time::text,
      sub.subject_name,
      t.teacher_id, t.teacher_name
    FROM section_time_slots ts
    LEFT JOIN subjects sub ON ts.subject_id = sub.subject_id
    LEFT JOIN teachers t ON ts.teacher_id = t.teacher_id
    WHERE ts.class_id = $1
    ORDER BY ts.day_of_week, ts.start_time ASC
  `;
  return await getMany(query, [classId]);
};
