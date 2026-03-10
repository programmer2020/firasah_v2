/**
 * PostgreSQL Database Configuration
 * Uses database-manager for handling Neon vs Local database switching
 */

import { getPool } from './database-manager.js';

export default getPool();
