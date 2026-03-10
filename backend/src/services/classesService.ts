/**
 * Classes Service
 */

import { getMany, getOne, executeQuery } from '../helpers/database.js';

export interface Class {
  class_id?: number;
  grade_id: number;
  section_id: number;
  class_name?: string;
}

export const getAllClasses = async () => {
  const query = `SELECT class_id, grade_id, section_id, class_name FROM classes`;
  return await getMany(query);
};

export const getClassById = async (classId: number) => {
  const query = `SELECT class_id, grade_id, section_id, class_name FROM classes WHERE class_id = $1`;
  return await getOne(query, [classId]);
};

export const createClass = async (cls: Class) => {
  const { grade_id, section_id, class_name } = cls;
  const query = `INSERT INTO classes (grade_id, section_id, class_name) VALUES ($1, $2, $3) RETURNING *`;
  const result = await executeQuery(query, [grade_id, section_id, class_name]);
  return result.rows[0];
};

export const updateClass = async (classId: number, cls: Class) => {
  const { class_name } = cls;
  const query = `UPDATE classes SET class_name = $1 WHERE class_id = $2 RETURNING *`;
  const result = await executeQuery(query, [class_name, classId]);
  return result.rows[0];
};

export const deleteClass = async (classId: number) => {
  const query = `DELETE FROM classes WHERE class_id = $1 RETURNING class_id`;
  const result = await executeQuery(query, [classId]);
  return result.rows[0];
};
