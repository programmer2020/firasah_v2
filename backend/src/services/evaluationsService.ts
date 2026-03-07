/**
 * Evaluations Service
 * Handles CRUD operations for evaluation records
 */

import { getOne, getMany, insert, update, deleteRecord } from '../helpers/database.js';

interface Evaluation {
  id?: number;
  file_id: number;
  kpi_id: number;
  evidence_count?: number;
  mark?: number;
}

/**
 * Get all evaluations
 * @returns Promise with array of evaluations
 */
export const getAllEvaluations = async () => {
  try {
    const query = `
      SELECT 
        e.id, 
        e.file_id, 
        e.kpi_id, 
        e.evidence_count, 
        e.mark, 
        e.created_at,
        k.kpi_name,
        s.filename
      FROM evaluations e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
      ORDER BY e.created_at DESC
    `;
    return await getMany(query);
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    throw error;
  }
};

/**
 * Get evaluation by ID
 * @param evaluationId Evaluation ID
 * @returns Promise with single evaluation
 */
export const getEvaluationById = async (evaluationId: number) => {
  try {
    const query = `
      SELECT 
        e.id, 
        e.file_id, 
        e.kpi_id, 
        e.evidence_count, 
        e.mark, 
        e.created_at,
        k.kpi_name,
        s.filename
      FROM evaluations e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
      WHERE e.id = $1
    `;
    return await getOne(query, [evaluationId]);
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    throw error;
  }
};

/**
 * Create a new evaluation
 * @param data Evaluation data
 * @returns Promise with created evaluation
 */
export const createEvaluation = async (data: Evaluation) => {
  try {
    if (!data.file_id || !data.kpi_id) {
      throw new Error('file_id and kpi_id are required');
    }

    return await insert('evaluations', {
      file_id: data.file_id,
      kpi_id: data.kpi_id,
      evidence_count: data.evidence_count || 0,
      mark: data.mark || null,
    });
  } catch (error) {
    console.error('Error creating evaluation:', error);
    throw error;
  }
};

/**
 * Update an evaluation
 * @param evaluationId Evaluation ID
 * @param data Data to update
 * @returns Promise with updated evaluation
 */
export const updateEvaluation = async (evaluationId: number, data: Partial<Evaluation>) => {
  try {
    const updateData: Record<string, any> = {};
    
    if (data.file_id) updateData.file_id = data.file_id;
    if (data.kpi_id) updateData.kpi_id = data.kpi_id;
    if (data.evidence_count !== undefined) updateData.evidence_count = data.evidence_count;
    if (data.mark !== undefined) updateData.mark = data.mark;
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    return await update('evaluations', updateData, 'id = $1', [evaluationId]);
  } catch (error) {
    console.error('Error updating evaluation:', error);
    throw error;
  }
};

/**
 * Delete an evaluation
 * @param evaluationId Evaluation ID
 * @returns Promise with deleted evaluation
 */
export const deleteEvaluation = async (evaluationId: number) => {
  try {
    return await deleteRecord('evaluations', 'id = $1', [evaluationId]);
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    throw error;
  }
};

/**
 * Get evaluations by KPI ID
 * @param kpiId KPI ID
 * @returns Promise with array of evaluations
 */
export const getEvaluationsByKPI = async (kpiId: number) => {
  try {
    const query = `
      SELECT 
        e.id, 
        e.file_id, 
        e.kpi_id, 
        e.evidence_count, 
        e.mark, 
        e.created_at,
        k.kpi_name,
        s.filename
      FROM evaluations e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
      WHERE e.kpi_id = $1
      ORDER BY e.created_at DESC
    `;
    return await getMany(query, [kpiId]);
  } catch (error) {
    console.error('Error fetching evaluations by KPI:', error);
    throw error;
  }
};

/**
 * Get evaluations by file ID
 * @param fileId File ID
 * @returns Promise with array of evaluations
 */
export const getEvaluationsByFile = async (fileId: number) => {
  try {
    const query = `
      SELECT 
        e.id, 
        e.file_id, 
        e.kpi_id, 
        e.evidence_count, 
        e.mark, 
        e.created_at,
        k.kpi_name,
        s.filename
      FROM evaluations e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
      WHERE e.file_id = $1
      ORDER BY e.created_at DESC
    `;
    return await getMany(query, [fileId]);
  } catch (error) {
    console.error('Error fetching evaluations by file:', error);
    throw error;
  }
};
