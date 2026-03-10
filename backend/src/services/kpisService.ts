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

/**
 * Get all KPI domains
 * @returns Promise with array of domains
 */
export const getAllKPIDomains = async () => {
  try {
    const query = `
      SELECT 
        domain_id,
        domain_code,
        domain_name,
        domain_description,
        sort_order,
        created_at,
        updated_at
      FROM kpi_domains
      ORDER BY sort_order ASC
    `;
    return await getMany(query);
  } catch (error) {
    console.error('Error fetching KPI domains:', error);
    throw error;
  }
};

/**
 * Get KPI domain by ID
 * @param domainId Domain ID
 * @returns Promise with single domain
 */
export const getKPIDomainById = async (domainId: number) => {
  try {
    const query = `
      SELECT 
        domain_id,
        domain_code,
        domain_name,
        domain_description,
        sort_order,
        created_at,
        updated_at
      FROM kpi_domains
      WHERE domain_id = $1
    `;
    return await getOne(query, [domainId]);
  } catch (error) {
    console.error('Error fetching KPI domain:', error);
    throw error;
  }
};

/**
 * Get KPIs organized by domain
 * @returns Promise with domains and their associated KPIs
 */
export const getKPIsGroupedByDomain = async () => {
  try {
    const query = `
      SELECT 
        d.domain_id,
        d.domain_code,
        d.domain_name,
        d.domain_description,
        d.sort_order,
        json_agg(
          json_build_object(
            'kpi_id', k.kpi_id,
            'kpi_code', k.kpi_code,
            'kpi_name', k.kpi_name,
            'kpi_description', k.kpi_description,
            'createdAt', k.createdAt,
            'createdBy', k.createdBy,
            'note', k.note
          ) ORDER BY k.kpi_code
        ) as kpis
      FROM kpi_domains d
      LEFT JOIN kpis k ON d.domain_id = k.domain_id
      GROUP BY d.domain_id, d.domain_code, d.domain_name, d.domain_description, d.sort_order
      ORDER BY d.sort_order ASC
    `;
    return await getMany(query);
  } catch (error) {
    console.error('Error fetching KPIs grouped by domain:', error);
    throw error;
  }
};

/**
 * Get KPIs for a specific domain
 * @param domainId Domain ID
 * @returns Promise with KPIs for that domain
 */
export const getKPIsByDomain = async (domainId: number) => {
  try {
    const query = `
      SELECT 
        k.kpi_id,
        k.domain_id,
        k.kpi_code,
        k.kpi_name,
        k.kpi_description,
        k.createdAt,
        k.createdBy,
        k.note,
        d.domain_name,
        d.domain_code
      FROM kpis k
      JOIN kpi_domains d ON k.domain_id = d.domain_id
      WHERE k.domain_id = $1
      ORDER BY k.kpi_code ASC
    `;
    return await getMany(query, [domainId]);
  } catch (error) {
    console.error('Error fetching KPIs by domain:', error);
    throw error;
  }
};
