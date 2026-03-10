/**
 * Database Configuration Manager
 * Handles switching between Neon Cloud and Local PostgreSQL
 */

import { Pool, PoolClient } from 'pg';

// Neon Cloud Configuration
const NEON_CONFIG = {
  host: 'ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_o4iEtH5mkKIz',
  database: 'neondb',
  ssl: {
    rejectUnauthorized: false,
  },
  client_encoding: 'UTF8',
};

// Local Database Configuration
const LOCAL_CONFIG = {
  host: process.env.LOCAL_DB_HOST || 'localhost',
  port: parseInt(process.env.LOCAL_DB_PORT || '5432', 10),
  user: process.env.LOCAL_DB_USER || 'postgres',
  password: process.env.LOCAL_DB_PASSWORD || '',
  database: process.env.LOCAL_DB_NAME || 'firasah_ai_db',
  client_encoding: 'UTF8',
};

let currentPool: Pool;
let isUsingNeon = true; // Default to Neon
let poolEnded = false; // Track if pool has been ended

// Initialize with Neon by default
const initializePool = () => {
  const config = isUsingNeon ? NEON_CONFIG : LOCAL_CONFIG;
  currentPool = new Pool(config);
  poolEnded = false; // Mark pool as active
  
  currentPool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  console.log(`✅ Database pool initialized: ${isUsingNeon ? 'Neon Cloud' : 'Local PostgreSQL'}`);
};

// Switch database configuration
export const switchDatabase = async (useNeon: boolean) => {
  try {
    if (isUsingNeon === useNeon) {
      console.log(`Already using ${useNeon ? 'Neon Cloud' : 'Local Database'}`);
      return true;
    }

    // End current connections with delay to allow pending queries to complete
    if (currentPool && !poolEnded) {
      console.log('Waiting for pending queries...');
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms for pending queries
      await currentPool.end();
      poolEnded = true;
      console.log('Closed previous database connections');
    }

    isUsingNeon = useNeon;
    initializePool();

    console.log(`📊 Switched to: ${useNeon ? 'Neon Cloud' : 'Local PostgreSQL'}`);
    return true;
  } catch (error) {
    console.error('Error switching database:', error);
    return false;
  }
};

// Get current pool
export const getPool = (): Pool => {
  if (!currentPool || poolEnded) {
    initializePool();
  }
  return currentPool;
};

// Get current configuration status
export const getDatabaseStatus = () => {
  return {
    isUsingNeon,
    host: isUsingNeon ? NEON_CONFIG.host : LOCAL_CONFIG.host,
    database: isUsingNeon ? NEON_CONFIG.database : LOCAL_CONFIG.database,
    type: isUsingNeon ? 'Neon Cloud' : 'Local PostgreSQL',
  };
};

// Initialize on module load
initializePool();

export default getPool();
