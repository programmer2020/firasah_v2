/**
 * Evidences Service
 * Handles CRUD operations for evidence records
 */

import { getOne, getMany, insert, update, deleteRecord } from '../helpers/database.js';

interface Evidence {
  id?: number;
  kpi_id: number;
  fragment_id: number;
  start_time?: string;
  end_time?: string;
  evidence_txt?: string;
  iscalculated?: boolean;
}

/**
 * Get all evidences
 * @returns Promise with array of evidences
 */
export const getAllEvidences = async () => {
  try {
    const query = `
      SELECT 
        e.id, 
        e.kpi_id, 
        e.fragment_id, 
        e.start_time, 
        e.end_time, 
        e.evidence_txt, 
        e.iscalculated,
        e.created_at,
        k.kpi_name,
        f.fragment_path,
        f.file_id
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN fragments f ON e.fragment_id = f.id
      ORDER BY e.created_at DESC
    `;
    return await getMany(query);
  } catch (error) {
    console.error('Error fetching evidences:', error);
    throw error;
  }
};

/**
 * Get evidence by ID
 * @param evidenceId Evidence ID
 * @returns Promise with single evidence
 */
export const getEvidenceById = async (evidenceId: number) => {
  try {
    const query = `
      SELECT 
        e.id, 
        e.kpi_id, 
        e.fragment_id, 
        e.start_time, 
        e.end_time, 
        e.evidence_txt, 
        e.iscalculated,
        e.created_at,
        k.kpi_name,
        f.fragment_path,
        f.file_id
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN fragments f ON e.fragment_id = f.id
      WHERE e.id = $1
    `;
    return await getOne(query, [evidenceId]);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    throw error;
  }
};

/**
 * Create a new evidence
 * @param data Evidence data
 * @returns Promise with created evidence
 */
export const createEvidence = async (data: Evidence) => {
  try {
    if (!data.kpi_id || !data.fragment_id) {
      throw new Error('kpi_id and fragment_id are required');
    }

    return await insert('evidences', {
      kpi_id: data.kpi_id,
      fragment_id: data.fragment_id,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      evidence_txt: data.evidence_txt || null,
    });
  } catch (error) {
    console.error('Error creating evidence:', error);
    throw error;
  }
};

/**
 * Update an evidence
 * @param evidenceId Evidence ID
 * @param data Data to update
 * @returns Promise with updated evidence
 */
export const updateEvidence = async (evidenceId: number, data: Partial<Evidence>) => {
  try {
    const updateData: Record<string, any> = {};
    
    if (data.kpi_id) updateData.kpi_id = data.kpi_id;
    if (data.fragment_id) updateData.fragment_id = data.fragment_id;
    if (data.start_time !== undefined) updateData.start_time = data.start_time;
    if (data.end_time !== undefined) updateData.end_time = data.end_time;
    if (data.evidence_txt !== undefined) updateData.evidence_txt = data.evidence_txt;
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    return await update('evidences', updateData, 'id = $1', [evidenceId]);
  } catch (error) {
    console.error('Error updating evidence:', error);
    throw error;
  }
};

/**
 * Delete an evidence
 * @param evidenceId Evidence ID
 * @returns Promise with deleted evidence
 */
export const deleteEvidence = async (evidenceId: number) => {
  try {
    return await deleteRecord('evidences', 'id = $1', [evidenceId]);
  } catch (error) {
    console.error('Error deleting evidence:', error);
    throw error;
  }
};

/**
 * Get evidences by KPI ID
 * @param kpiId KPI ID
 * @returns Promise with array of evidences
 */
export const getEvidencesByKPI = async (kpiId: number) => {
  try {
    const query = `
      SELECT 
        e.id, 
        e.kpi_id, 
        e.fragment_id, 
        e.start_time, 
        e.end_time, 
        e.evidence_txt, 
        e.iscalculated,
        e.created_at,
        k.kpi_name,
        f.fragment_path,
        f.file_id
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN fragments f ON e.fragment_id = f.id
      WHERE e.kpi_id = $1
      ORDER BY e.created_at DESC
    `;
    return await getMany(query, [kpiId]);
  } catch (error) {
    console.error('Error fetching evidences by KPI:', error);
    throw error;
  }
};

/**
 * Get evidences by fragment ID
 * @param fragmentId Fragment ID
 * @returns Promise with array of evidences
 */
export const getEvidencesByFragment = async (fragmentId: number) => {
  try {
    const query = `
      SELECT 
        e.id, 
        e.kpi_id, 
        e.fragment_id, 
        e.start_time, 
        e.end_time, 
        e.evidence_txt, 
        e.iscalculated,
        e.created_at,
        k.kpi_name,
        f.fragment_path,
        f.file_id
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN fragments f ON e.fragment_id = f.id
      WHERE e.fragment_id = $1
      ORDER BY e.created_at DESC
    `;
    return await getMany(query, [fragmentId]);
  } catch (error) {
    console.error('Error fetching evidences by fragment:', error);
    throw error;
  }
};

/**
 * Get evidences by file ID (for backward compatibility)
 * @param fileId File ID
 * @returns Promise with array of evidences
 */
export const getEvidencesByFile = async (fileId: number) => {
  try {
    const query = `
      SELECT 
        e.id, 
        e.kpi_id, 
        e.fragment_id, 
        e.start_time, 
        e.end_time, 
        e.evidence_txt, 
        e.iscalculated,
        e.created_at,
        k.kpi_name,
        f.fragment_path,
        f.file_id
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN fragments f ON e.fragment_id = f.id
      LEFT JOIN sound_files s ON f.file_id = s.file_id
      WHERE f.file_id = $1
      ORDER BY e.created_at DESC
    `;
    return await getMany(query, [fileId]);
  } catch (error) {
    console.error('Error fetching evidences by file:', error);
    throw error;
  }
};
