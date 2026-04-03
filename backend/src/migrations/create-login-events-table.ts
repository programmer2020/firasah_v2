/**
 * Migration: Create login_events table for tracking login activity
 */

import { executeQuery } from '../helpers/database.js';

async function run() {
  console.log('🔄 Creating login_events table for tracking login activity...');

  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS login_events (
        login_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        email VARCHAR(255),
        login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(50),
        user_agent TEXT
      );
    `);

    console.log('✅ login_events table created successfully');

    // Create index for faster queries
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_login_events_user_id ON login_events(user_id);
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_login_events_timestamp ON login_events(login_timestamp);
    `);

    console.log('✅ Indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating login_events table:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(console.error);
}

export default run;
