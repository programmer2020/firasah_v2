/**
 * Grades Service
 */

import { getMany, getOne, executeQuery } from '../helpers/database.js';

export interface Grade {
  grade_id?: number;
  school_id: number;
  grade_name: string;
  grade_level: number;
}

export const getAllGrades = async (userId?: number | null) => {
  if (userId) {
    const query = `SELECT grade_id, school_id, grade_name, grade_level FROM grades WHERE user_id = $1 ORDER BY grade_level`;
    return await getMany(query, [userId]);
  }
  const query = `SELECT grade_id, school_id, grade_name, grade_level FROM grades ORDER BY grade_level`;
  return await getMany(query);
};

export const getGradeById = async (gradeId: number) => {
  const query = `SELECT grade_id, school_id, grade_name, grade_level FROM grades WHERE grade_id = $1`;
  return await getOne(query, [gradeId]);
};

export const createGrade = async (grade: Grade, userId?: number) => {
  const { school_id, grade_name, grade_level } = grade;
  const query = `INSERT INTO grades (school_id, grade_name, grade_level, user_id) VALUES ($1, $2, $3, $4) RETURNING *`;
  const result = await executeQuery(query, [school_id, grade_name, parseInt(grade_level as any, 10), userId || null]);
  return result.rows[0];
};

export const updateGrade = async (gradeId: number, grade: Grade) => {
  const { grade_name, grade_level } = grade;
  const query = `UPDATE grades SET grade_name = $1, grade_level = $2 WHERE grade_id = $3 RETURNING *`;
  const result = await executeQuery(query, [grade_name, grade_level, gradeId]);
  return result.rows[0];
};

export const deleteGrade = async (gradeId: number) => {
  const query = `DELETE FROM grades WHERE grade_id = $1 RETURNING grade_id`;
  const result = await executeQuery(query, [gradeId]);
  return result.rows[0];
};
