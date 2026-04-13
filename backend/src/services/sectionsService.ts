/**
 * Sections Service
 */

import { getMany, getOne, executeQuery } from '../helpers/database.js';

export interface Section {
  section_id?: number;
  section_name: string;
}

export const getAllSections = async (userId?: number | null) => {
  if (userId) {
    const query = `SELECT section_id, section_name FROM sections WHERE user_id = $1 ORDER BY section_name`;
    return await getMany(query, [userId]);
  }
  const query = `SELECT section_id, section_name FROM sections ORDER BY section_name`;
  return await getMany(query);
};

export const getSectionById = async (sectionId: number) => {
  const query = `SELECT section_id, section_name FROM sections WHERE section_id = $1`;
  return await getOne(query, [sectionId]);
};

export const createSection = async (section: Section, userId?: number) => {
  const { section_name } = section;
  const query = `INSERT INTO sections (section_name, user_id) VALUES ($1, $2) RETURNING *`;
  const result = await executeQuery(query, [section_name, userId || null]);
  return result.rows[0];
};

export const updateSection = async (sectionId: number, section: Section) => {
  const { section_name } = section;
  const query = `UPDATE sections SET section_name = $1 WHERE section_id = $2 RETURNING *`;
  const result = await executeQuery(query, [section_name, sectionId]);
  return result.rows[0];
};

export const deleteSection = async (sectionId: number) => {
  const query = `DELETE FROM sections WHERE section_id = $1 RETURNING section_id`;
  const result = await executeQuery(query, [sectionId]);
  return result.rows[0];
};
