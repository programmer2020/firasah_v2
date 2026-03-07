/**
 * KPIs Service
 * Handles CRUD operations for Key Performance Indicators
 */

import { getOne, getMany, insert, update, deleteRecord } from '../helpers/database.js';

interface KPI {
  kpi_id?: number;
  kpi_name: string;
  createdAt?: string;
  createdBy: string;
  note?: string;
}

/**
 * Get all KPIs
 * @returns Promise with array of KPIs
 */
export const getAllKPIs = async () => {
  try {
    const query = `
      SELECT * FROM kpis
      ORDER BY createdAt DESC
    `;
    return await getMany(query);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    throw error;
  }
};

/**
 * Get KPI by ID
 * @param kpiId KPI ID
 * @returns Promise with single KPI
 */
export const getKPIById = async (kpiId: number) => {
  try {
    const query = `
      SELECT * FROM kpis
      WHERE kpi_id = $1
    `;
    return await getOne(query, [kpiId]);
  } catch (error) {
    console.error('Error fetching KPI:', error);
    throw error;
  }
};

/**
 * Create a new KPI
 * @param data KPI data
 * @returns Promise with created KPI
 */
export const createKPI = async (data: KPI) => {
  try {
    if (!data.kpi_name || !data.createdBy) {
      throw new Error('kpi_name and createdBy are required');
    }

    return await insert('kpis', {
      kpi_name: data.kpi_name,
      createdAt: new Date(),
      createdBy: data.createdBy,
      note: data.note || null,
    });
  } catch (error) {
    console.error('Error creating KPI:', error);
    throw error;
  }
};

/**
 * Update a KPI
 * @param kpiId KPI ID
 * @param data Data to update
 * @returns Promise with updated KPI
 */
export const updateKPI = async (kpiId: number, data: Partial<KPI>) => {
  try {
    const updateData: Record<string, any> = {};
    
    if (data.kpi_name) updateData.kpi_name = data.kpi_name;
    if (data.createdBy) updateData.createdBy = data.createdBy;
    if (data.note !== undefined) updateData.note = data.note;
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    return await update('kpis', updateData, 'kpi_id = $1', [kpiId]);
  } catch (error) {
    console.error('Error updating KPI:', error);
    throw error;
  }
};

/**
 * Delete a KPI
 * @param kpiId KPI ID
 * @returns Promise with deleted KPI
 */
export const deleteKPI = async (kpiId: number) => {
  try {
    return await deleteRecord('kpis', 'kpi_id = $1', [kpiId]);
  } catch (error) {
    console.error('Error deleting KPI:', error);
    throw error;
  }
};

/**
 * Get KPIs by creator
 * @param createdBy Creator username
 * @returns Promise with array of KPIs
 */
export const getKPIsByCreator = async (createdBy: string) => {
  try {
    const query = `
      SELECT * FROM kpis
      WHERE createdBy = $1
      ORDER BY createdAt DESC
    `;
    return await getMany(query, [createdBy]);
  } catch (error) {
    console.error('Error fetching KPIs by creator:', error);
    throw error;
  }
};
