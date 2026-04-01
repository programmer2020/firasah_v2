/**
 * Evidences Service
 * Handles CRUD operations for evidence records
 */

import { getOne, getMany, insert, update, deleteRecord } from '../helpers/database.js';

interface Evidence {
  evidence_id?: number;
  kpi_id: number;
  file_id: number;
  start_time?: string;
  end_time?: string;
  evidence_txt?: string;
}

/**
 * Get all evidences
 * @returns Promise with array of evidences
 */
export const getAllEvidences = async () => {
  try {
    const query = `
      SELECT
        e.evidence_id,
        e.kpi_id,
        e.file_id,
        TO_CHAR(e.start_time, 'HH24:MI:SS') as start_time,
        TO_CHAR(e.end_time, 'HH24:MI:SS') as end_time,
        e.evidence_txt,
        e.created_at,
        k.kpi_name,
        s.filename
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
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
        e.evidence_id,
        e.kpi_id,
        e.file_id,
        TO_CHAR(e.start_time, 'HH24:MI:SS') as start_time,
        TO_CHAR(e.end_time, 'HH24:MI:SS') as end_time,
        e.evidence_txt,
        e.created_at,
        k.kpi_name,
        s.filename
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
      WHERE e.evidence_id = $1
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
    if (!data.kpi_id || !data.file_id) {
      throw new Error('kpi_id and file_id are required');
    }

    return await insert('evidences', {
      kpi_id: data.kpi_id,
      file_id: data.file_id,
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
    if (data.file_id) updateData.file_id = data.file_id;
    if (data.start_time !== undefined) updateData.start_time = data.start_time;
    if (data.end_time !== undefined) updateData.end_time = data.end_time;
    if (data.evidence_txt !== undefined) updateData.evidence_txt = data.evidence_txt;

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    return await update('evidences', updateData, 'evidence_id = $1', [evidenceId]);
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
    return await deleteRecord('evidences', 'evidence_id = $1', [evidenceId]);
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
        e.evidence_id,
        e.kpi_id,
        e.file_id,
        TO_CHAR(e.start_time, 'HH24:MI:SS') as start_time,
        TO_CHAR(e.end_time, 'HH24:MI:SS') as end_time,
        e.evidence_txt,
        e.created_at,
        k.kpi_name,
        s.filename
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
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
 * Get evidences by file ID
 * @param fileId File ID
 * @returns Promise with array of evidences
 */
export const getEvidencesByFile = async (fileId: number) => {
  try {
    const query = `
      SELECT
        e.evidence_id,
        e.kpi_id,
        e.file_id,
        TO_CHAR(e.start_time, 'HH24:MI:SS') as start_time,
        TO_CHAR(e.end_time, 'HH24:MI:SS') as end_time,
        e.evidence_txt,
        e.created_at,
        k.kpi_name,
        s.filename
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      LEFT JOIN sound_files s ON e.file_id = s.file_id
      WHERE e.file_id = $1
      ORDER BY e.created_at DESC
    `;
    return await getMany(query, [fileId]);
  } catch (error) {
    console.error('Error fetching evidences by file:', error);
    throw error;
  }
};
