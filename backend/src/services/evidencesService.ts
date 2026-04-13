/**
 * Evidences Service
 * Handles CRUD operations for evidence records
 */

import { getOne, getMany, insert, update, deleteRecord } from '../helpers/database.js';

interface Evidence {
  evidence_id?: number;
  kpi_id: number;
  lecture_id: number;
  start_time?: string;
  end_time?: string;
  status?: string;
  facts?: string;
  interpretation?: string;
  limitations?: string;
  confidence?: number;
}

/**
 * Get all evidences (optionally filtered by user_id via lecture → sound_files)
 */
export const getAllEvidences = async (userId?: number | null) => {
  try {
    const query = `
      SELECT
        e.evidence_id,
        e.kpi_id,
        e.lecture_id,
        e.start_time,
        e.end_time,
        e.status,
        e.facts,
        e.interpretation,
        e.limitations,
        e.confidence,
        e.created_at,
        k.kpi_name
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      ${userId ? `LEFT JOIN lecture l ON e.lecture_id = l.lecture_id
      LEFT JOIN sound_files sf ON l.file_id = sf.file_id
      WHERE sf.user_id = $1` : ''}
      ORDER BY e.created_at DESC
    `;
    return await getMany(query, userId ? [userId] : []);
  } catch (error) {
    console.error('Error fetching evidences:', error);
    throw error;
  }
};

/**
 * Get evidence by ID
 */
export const getEvidenceById = async (evidenceId: number) => {
  try {
    const query = `
      SELECT
        e.evidence_id,
        e.kpi_id,
        e.lecture_id,
        e.start_time,
        e.end_time,
        e.status,
        e.facts,
        e.interpretation,
        e.limitations,
        e.confidence,
        e.created_at,
        k.kpi_name
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
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
 */
export const createEvidence = async (data: Evidence) => {
  try {
    if (!data.kpi_id || !data.lecture_id) {
      throw new Error('kpi_id and lecture_id are required');
    }

    return await insert('evidences', {
      kpi_id: data.kpi_id,
      lecture_id: data.lecture_id,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      status: data.status || null,
      facts: data.facts || null,
      interpretation: data.interpretation || null,
      limitations: data.limitations || null,
      confidence: data.confidence ?? null,
    });
  } catch (error) {
    console.error('Error creating evidence:', error);
    throw error;
  }
};

/**
 * Update an evidence
 */
export const updateEvidence = async (evidenceId: number, data: Partial<Evidence>) => {
  try {
    const updateData: Record<string, any> = {};

    if (data.kpi_id) updateData.kpi_id = data.kpi_id;
    if (data.lecture_id) updateData.lecture_id = data.lecture_id;
    if (data.start_time !== undefined) updateData.start_time = data.start_time;
    if (data.end_time !== undefined) updateData.end_time = data.end_time;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.facts !== undefined) updateData.facts = data.facts;
    if (data.interpretation !== undefined) updateData.interpretation = data.interpretation;
    if (data.limitations !== undefined) updateData.limitations = data.limitations;
    if (data.confidence !== undefined) updateData.confidence = data.confidence;

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
 */
export const getEvidencesByKPI = async (kpiId: number) => {
  try {
    const query = `
      SELECT
        e.evidence_id,
        e.kpi_id,
        e.lecture_id,
        e.start_time,
        e.end_time,
        e.status,
        e.facts,
        e.interpretation,
        e.limitations,
        e.confidence,
        e.created_at,
        k.kpi_name
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
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
 * Get evidences by lecture ID
 */
export const getEvidencesByLecture = async (lectureId: number) => {
  try {
    const query = `
      SELECT
        e.evidence_id,
        e.kpi_id,
        e.lecture_id,
        e.start_time,
        e.end_time,
        e.status,
        e.facts,
        e.interpretation,
        e.limitations,
        e.confidence,
        e.created_at,
        k.kpi_name
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      WHERE e.lecture_id = $1
      ORDER BY e.created_at DESC
    `;
    return await getMany(query, [lectureId]);
  } catch (error) {
    console.error('Error fetching evidences by lecture:', error);
    throw error;
  }
};

/**
 * Get evidences for a sound file (via lecture.file_id)
 */
export const getEvidencesByFile = async (fileId: number) => {
  try {
    const query = `
      SELECT
        e.evidence_id,
        e.kpi_id,
        e.lecture_id,
        e.start_time,
        e.end_time,
        e.status,
        e.facts,
        e.interpretation,
        e.limitations,
        e.confidence,
        e.created_at,
        k.kpi_name,
        l.file_id
      FROM evidences e
      LEFT JOIN kpis k ON e.kpi_id = k.kpi_id
      JOIN lecture l ON e.lecture_id = l.lecture_id
      WHERE l.file_id = $1
      ORDER BY e.created_at DESC
    `;
    return await getMany(query, [fileId]);
  } catch (error) {
    console.error('Error fetching evidences by file:', error);
    throw error;
  }
};
