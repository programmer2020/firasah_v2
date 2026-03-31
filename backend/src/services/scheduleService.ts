/**
 * Schedule Service
 * Handles class schedule, time slots, and related lookups
 */

import { getMany, getOne, insert, executeQuery } from '../helpers/database.js';

// ── Lookups ─────────────────────────────────────────────

export const getAllClasses = async () => {
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

export const getAllTeachers = async () => {
  const query = `
    SELECT teacher_id, teacher_name, teacher_email
    FROM teachers
    ORDER BY teacher_name ASC
  `;
  return await getMany(query);
};

export const getAllSubjects = async () => {
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
           ts.start_time::text, ts.end_time::text,
           cs.schedule_id, cs.teacher_id,
           sub.subject_name, t.teacher_name
    FROM section_time_slots ts
    LEFT JOIN class_schedule cs
      ON ts.time_slot_id = cs.time_slot_id
     AND ts.class_id = cs.class_id
    LEFT JOIN subjects sub ON ts.subject_id = sub.subject_id
    LEFT JOIN teachers t ON cs.teacher_id = t.teacher_id
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
}) => {
  return await insert('section_time_slots', {
    class_id: data.class_id,
    day_of_week: data.day_of_week,
    start_time: data.start_time,
    end_time: data.end_time,
    subject_id: data.subject_id,
  });
};

export const deleteTimeSlot = async (timeSlotId: number) => {
  // Delete schedule entry first (FK), then the time slot
  await executeQuery('DELETE FROM class_schedule WHERE time_slot_id = $1', [timeSlotId]);
  const result = await executeQuery(
    'DELETE FROM section_time_slots WHERE time_slot_id = $1 RETURNING *',
    [timeSlotId]
  );
  return result.rows[0] || null;
};

// ── Schedule (assign teacher + subject to time slot) ────

export const assignSchedule = async (data: {
  class_id: number;
  time_slot_id: number;
  subject_id: number;
  teacher_id: number;
}) => {
  // Upsert: if a schedule already exists for this class+timeslot, update it
  const existing = await getOne(
    'SELECT schedule_id FROM class_schedule WHERE class_id = $1 AND time_slot_id = $2',
    [data.class_id, data.time_slot_id]
  );

  if (existing) {
    await executeQuery(
      `UPDATE section_time_slots
       SET subject_id = $1
       WHERE time_slot_id = $2`,
      [data.subject_id, data.time_slot_id]
    );

    const result = await executeQuery(
      `UPDATE class_schedule
       SET subject_id = $1, teacher_id = $2
       WHERE schedule_id = $3
       RETURNING *`,
      [data.subject_id, data.teacher_id, existing.schedule_id]
    );
    return result.rows[0];
  }

  await executeQuery(
    `UPDATE section_time_slots
     SET subject_id = $1
     WHERE time_slot_id = $2`,
    [data.subject_id, data.time_slot_id]
  );

  return await insert('class_schedule', {
    class_id: data.class_id,
    time_slot_id: data.time_slot_id,
    subject_id: data.subject_id,
    teacher_id: data.teacher_id,
  });
};

export const removeSchedule = async (scheduleId: number) => {
  const result = await executeQuery(
    'DELETE FROM class_schedule WHERE schedule_id = $1 RETURNING *',
    [scheduleId]
  );
  return result.rows[0] || null;
};

// ── Full schedule for a class ───────────────────────────

export const getFullSchedule = async (classId: number) => {
  const query = `
    SELECT
      cs.schedule_id,
      ts.time_slot_id, ts.day_of_week, ts.subject_id,
      ts.start_time::text, ts.end_time::text,
      sub.subject_name,
      t.teacher_id, t.teacher_name
    FROM section_time_slots ts
    LEFT JOIN class_schedule cs
      ON cs.time_slot_id = ts.time_slot_id
     AND cs.class_id = ts.class_id
    LEFT JOIN subjects sub ON ts.subject_id = sub.subject_id
    LEFT JOIN teachers t ON cs.teacher_id = t.teacher_id
    WHERE ts.class_id = $1
    ORDER BY ts.day_of_week, ts.start_time ASC
  `;
  return await getMany(query, [classId]);
};
