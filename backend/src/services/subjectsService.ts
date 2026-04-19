/**
 * Subjects Service
 */

import { getMany, getOne, executeQuery } from '../helpers/database.js';

export interface Subject {
  subject_id?: number;
  subject_name: string;
}

export const getAllSubjects = async (userId?: number | null) => {
  if (userId) {
    const query = `SELECT subject_id, subject_name, created_at FROM subjects WHERE user_id = $1 ORDER BY subject_name`;
    return await getMany(query, [userId]);
  }
  const query = `SELECT subject_id, subject_name, created_at FROM subjects ORDER BY subject_name`;
  return await getMany(query);
};

export const getSubjectById = async (subjectId: number) => {
  const query = `SELECT subject_id, subject_name, created_at FROM subjects WHERE subject_id = $1`;
  return await getOne(query, [subjectId]);
};

export const createSubject = async (subject: Subject, userId?: number) => {
  const { subject_name } = subject;
  const query = `INSERT INTO subjects (subject_name, user_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *`;
  const result = await executeQuery(query, [subject_name, userId || null]);
  return result.rows[0];
};

export const updateSubject = async (subjectId: number, subject: Subject) => {
  const { subject_name } = subject;
  const query = `UPDATE subjects SET subject_name = $1 WHERE subject_id = $2 RETURNING *`;
  const result = await executeQuery(query, [subject_name, subjectId]);
  return result.rows[0];
};

export const deleteSubject = async (subjectId: number) => {
  const query = `DELETE FROM subjects WHERE subject_id = $1 RETURNING subject_id`;
  const result = await executeQuery(query, [subjectId]);
  return result.rows[0];
};
