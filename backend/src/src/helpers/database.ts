/**
 * PostgreSQL Helper Functions
 * Provides utility functions for database operations
 */

import pool from '../config/database.js';
import { QueryResult, PoolClient } from 'pg';

interface QueryOptions {
  values?: any[];
  timeout?: number;
}

/**
 * Execute a single query
 * @param query SQL query string
 * @param values Query parameters
 * @returns Promise with query result
 */
export const executeQuery = async (
  query: string,
  values?: any[]
): Promise<QueryResult> => {
  try {
    const result = await pool.query(query, values);
    return result;
  } catch (error) {
    console.error('Database Query Error:', error);
    throw error;
  }
};

/**
 * Get a single row from database
 * @param query SQL query string
 * @param values Query parameters
 * @returns Promise with single row or null
 */
export const getOne = async (query: string, values?: any[]) => {
  try {
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Database Get One Error:', error);
    throw error;
  }
};

/**
 * Get multiple rows from database
 * @param query SQL query string
 * @param values Query parameters
 * @returns Promise with array of rows
 */
export const getMany = async (query: string, values?: any[]) => {
  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Database Get Many Error:', error);
    throw error;
  }
};

/**
 * Insert data into database
 * @param tableName Table name
 * @param data Object with column names and values
 * @returns Promise with inserted row
 */
export const insert = async (tableName: string, data: Record<string, any>) => {
  try {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');
    
    const query = `
      INSERT INTO ${tableName} (${columns.join(',')})
      VALUES (${placeholders})
      RETURNING *;
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Database Insert Error:', error);
    throw error;
  }
};

/**
 * Update data in database
 * @param tableName Table name
 * @param data Object with columns to update
 * @param whereClause WHERE clause (e.g., "id = $1")
 * @param whereValues Values for WHERE clause
 * @returns Promise with updated row
 */
export const update = async (
  tableName: string,
  data: Record<string, any>,
  whereClause: string,
  whereValues?: any[]
) => {
  try {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(',');
    
    const allValues = [...values, ...(whereValues || [])];
    const placeholderIndex = values.length;
    const updatedWhereClause = whereClause.replace(
      /\$(\d+)/g,
      (_, num) => `$${parseInt(num) + placeholderIndex}`
    );
    
    const query = `
      UPDATE ${tableName}
      SET ${setClause}
      WHERE ${updatedWhereClause}
      RETURNING *;
    `;
    
    const result = await pool.query(query, allValues);
    return result.rows[0];
  } catch (error) {
    console.error('Database Update Error:', error);
    throw error;
  }
};

/**
 * Delete data from database
 * @param tableName Table name
 * @param whereClause WHERE clause (e.g., "id = $1")
 * @param whereValues Values for WHERE clause
 * @returns Promise with deleted row
 */
export const deleteRecord = async (
  tableName: string,
  whereClause: string,
  whereValues?: any[]
) => {
  try {
    const query = `
      DELETE FROM ${tableName}
      WHERE ${whereClause}
      RETURNING *;
    `;
    
    const result = await pool.query(query, whereValues);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Database Delete Error:', error);
    throw error;
  }
};

/**
 * Get count of records
 * @param tableName Table name
 * @param whereClause Optional WHERE clause
 * @param whereValues Optional WHERE values
 * @returns Promise with count
 */
export const getCount = async (
  tableName: string,
  whereClause?: string,
  whereValues?: any[]
) => {
  try {
    const query = whereClause
      ? `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause};`
      : `SELECT COUNT(*) as count FROM ${tableName};`;
    
    const result = await pool.query(query, whereValues);
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Database Count Error:', error);
    throw error;
  }
};

/**
 * Execute transaction
 * @param callback Async function with client
 * @returns Promise with transaction result
 */
export const transaction = async (
  callback: (client: PoolClient) => Promise<any>
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction Error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Check if table exists
 * @param tableName Table name
 * @returns Promise with boolean
 */
export const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = $1
      );
    `;
    const result = await pool.query(query, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error('Table Exists Check Error:', error);
    throw error;
  }
};

/**
 * Paginate results
 * @param query SQL query
 * @param page Page number (1-indexed)
 * @param limit Items per page
 * @param values Query parameters
 * @returns Promise with paginated results
 */
export const paginate = async (
  query: string,
  page: number = 1,
  limit: number = 10,
  values?: any[]
) => {
  try {
    const offset = (page - 1) * limit;
    const paginatedQuery = `${query} LIMIT $${(values?.length || 0) + 1} OFFSET $${(values?.length || 0) + 2};`;
    const countQuery = `SELECT COUNT(*) FROM (${query}) as count_table;`;
    
    const [dataResult, countResult] = await Promise.all([
      pool.query(paginatedQuery, [...(values || []), limit, offset]),
      pool.query(countQuery, values),
    ]);
    
    const total = parseInt(countResult.rows[0].count, 10);
    
    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Pagination Error:', error);
    throw error;
  }
};

export default {
  executeQuery,
  getOne,
  getMany,
  insert,
  update,
  deleteRecord,
  getCount,
  transaction,
  tableExists,
  paginate,
};
