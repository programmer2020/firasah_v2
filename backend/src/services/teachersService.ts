/**
 * Teachers Service
 */

import { getMany, getOne, executeQuery } from '../helpers/database.js';

export interface Teacher {
  teacher_id?: number;
  school_id: number;
  teacher_name: string;
  teacher_email?: string;
  teacher_phone?: string;
}

export const getAllTeachers = async (userId?: number | null) => {
  if (userId) {
    const query = `
      SELECT teacher_id, school_id, teacher_name, teacher_email, teacher_phone
      FROM teachers
      WHERE user_id = $1
      ORDER BY teacher_name
    `;
    return await getMany(query, [userId]);
  }
  const query = `
    SELECT teacher_id, school_id, teacher_name, teacher_email, teacher_phone
    FROM teachers
    ORDER BY teacher_name
  `;
  return await getMany(query);
};

export const getTeacherById = async (teacherId: number) => {
  const query = `
    SELECT teacher_id, school_id, teacher_name, teacher_email, teacher_phone
    FROM teachers
    WHERE teacher_id = $1
  `;
  return await getOne(query, [teacherId]);
};

export const createTeacher = async (teacher: Teacher, userId?: number) => {
  const { school_id, teacher_name, teacher_email, teacher_phone } = teacher;
  const query = `
    INSERT INTO teachers (school_id, teacher_name, teacher_email, teacher_phone, user_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING teacher_id, school_id, teacher_name, teacher_email, teacher_phone
  `;
  const result = await executeQuery(query, [school_id, teacher_name, teacher_email, teacher_phone, userId || null]);
  return result.rows[0];
};

export const updateTeacher = async (teacherId: number, teacher: Teacher) => {
  const { teacher_name, teacher_email, teacher_phone } = teacher;
  const query = `
    UPDATE teachers
    SET teacher_name = $1, teacher_email = $2, teacher_phone = $3
    WHERE teacher_id = $4
    RETURNING teacher_id, school_id, teacher_name, teacher_email, teacher_phone
  `;
  const result = await executeQuery(query, [teacher_name, teacher_email, teacher_phone, teacherId]);
  return result.rows[0];
};

export const deleteTeacher = async (teacherId: number) => {
  const query = `DELETE FROM teachers WHERE teacher_id = $1 RETURNING teacher_id`;
  const result = await executeQuery(query, [teacherId]);
  return result.rows[0];
};
