/**
 * Schools Service
 * Handles all school-related database operations
 */

import { getMany, getOne, executeQuery } from '../helpers/database.js';

export interface School {
  school_id?: number;
  school_name: string;
  school_code?: string;
  city?: string;
  country?: string;
  address?: string;
  phone?: string;
  email?: string;
}

/**
 * Get all schools (optionally filtered by user_id)
 */
export const getAllSchools = async (userId?: number | null) => {
  try {
    if (userId) {
      const query = `
        SELECT school_id, school_name, school_code, city, country, created_at
        FROM schools
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      return await getMany(query, [userId]);
    }
    const query = `
      SELECT school_id, school_name, school_code, city, country, created_at
      FROM schools
      ORDER BY created_at DESC
    `;
    return await getMany(query);
  } catch (error) {
    console.error('Error fetching schools:', error);
    throw error;
  }
};

/**
 * Get school by ID
 */
export const getSchoolById = async (schoolId: number) => {
  try {
    const query = `
      SELECT school_id, school_name, school_code, city, country, created_at
      FROM schools
      WHERE school_id = $1
    `;
    return await getOne(query, [schoolId]);
  } catch (error) {
    console.error('Error fetching school:', error);
    throw error;
  }
};

/**
 * Create a new school
 */
export const createSchool = async (school: School, userId?: number) => {
  try {
    const { school_name, school_code, city, country } = school;
    const query = `
      INSERT INTO schools (school_name, school_code, city, country, user_id, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING school_id, school_name, school_code, city, country, user_id, created_at
    `;
    const result = await executeQuery(query, [school_name, school_code, city, country, userId || null]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating school:', error);
    throw error;
  }
};

/**
 * Update a school
 */
export const updateSchool = async (schoolId: number, school: School) => {
  try {
    const { school_name, school_code, city, country } = school;
    const query = `
      UPDATE schools
      SET school_name = $1, school_code = $2, city = $3, country = $4
      WHERE school_id = $5
      RETURNING school_id, school_name, school_code, city, country, created_at
    `;
    const result = await executeQuery(query, [school_name, school_code, city, country, schoolId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating school:', error);
    throw error;
  }
};

/**
 * Delete a school
 */
export const deleteSchool = async (schoolId: number) => {
  try {
    const query = `
      DELETE FROM schools
      WHERE school_id = $1
      RETURNING school_id
    `;
    const result = await executeQuery(query, [schoolId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error deleting school:', error);
    throw error;
  }
};
