#!/usr/bin/env node
/**
 * Alternative Migration Script using pg_dump and psql
 * This method is more robust for production databases
 * 
 * Prerequisites:
 * - PostgreSQL command-line tools installed (pg_dump, psql)
 * - Both local and Neon databases must be accessible
 * 
 * Usage: node migrate-pg-dump.mjs
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// Database configurations
const LOCAL_DB = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'firasah_ai_db',
};

const NEON_DB = {
  host: 'ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_o4iEtH5mkKIz',
  database: 'neondb',
};

const DUMP_FILE = path.join(process.cwd(), 'firasah_backup.sql');

class PostgreSQLMigration {
  async executeCommand(command, description) {
    try {
      console.log(`\n⏳ ${description}...`);
      const { stdout, stderr } = await execAsync(command, { maxBuffer: 50 * 1024 * 1024 });
      console.log(`✅ ${description} completed`);
      return stdout;
    } catch (error) {
      console.error(`❌ Error during ${description}:`, error.message);
      throw error;
    }
  }

  async dumpLocalDatabase() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║    STEP 1: DUMPING LOCAL DATABASE    ║');
    console.log('╚════════════════════════════════════════╝');

    const pgDumpCommand = `pg_dump --host ${LOCAL_DB.host} --port ${LOCAL_DB.port} --username ${LOCAL_DB.user} --password --no-profile --verbose --no-password -d ${LOCAL_DB.database} > "${DUMP_FILE}"`;

    // Create a custom environment with PGPASSWORD
    const env = { ...process.env };
    env.PGPASSWORD = LOCAL_DB.password;

    return new Promise((resolve, reject) => {
      console.log(`\n📥 Creating database dump from local server...`);
      
      const proc = spawn('pg_dump', [
        '--host', LOCAL_DB.host,
        '--port', LOCAL_DB.port.toString(),
        '--username', LOCAL_DB.user,
        '--verbose',
        '--no-password',
        LOCAL_DB.database,
      ], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const writeStream = fs.createWriteStream(DUMP_FILE);

      proc.stdout.pipe(writeStream);

      proc.on('error', (error) => {
        console.error('❌ pg_dump error:', error.message);
        reject(error);
      });

      writeStream.on('error', (error) => {
        console.error('❌ Write error:', error.message);
        reject(error);
      });

      writeStream.on('finish', () => {
        const stats = fs.statSync(DUMP_FILE);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`✅ Database dump created: ${DUMP_FILE} (${sizeInMB} MB)`);
        resolve();
      });
    });
  }

  async restoreToneonDatabase() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║    STEP 2: RESTORING TO NEON DB     ║');
    console.log('╚════════════════════════════════════════╝');

    return new Promise((resolve, reject) => {
      console.log(`\n📤 Restoring database to Neon cloud...`);
      
      const env = { ...process.env };
      env.PGPASSWORD = NEON_DB.password;

      const proc = spawn('psql', [
        '--host', NEON_DB.host,
        '--port', NEON_DB.port.toString(),
        '--username', NEON_DB.user,
        '--no-password',
        '--dbname', NEON_DB.database,
        '--file', DUMP_FILE,
      ], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let errorOutput = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('error', (error) => {
        console.error('❌ psql error:', error.message);
        reject(error);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Database restored successfully to Neon`);
          resolve();
        } else {
          console.error('❌ Restore failed with code:', code);
          if (errorOutput) console.error('Error details:', errorOutput);
          reject(new Error(`psql exited with code ${code}`));
        }
      });
    });
  }

  async verifyMigration() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║    STEP 3: VERIFYING MIGRATION      ║');
    console.log('╚════════════════════════════════════════╝');

    const env = { ...process.env };
    env.PGPASSWORD = NEON_DB.password;

    return new Promise((resolve, reject) => {
      const proc = spawn('psql', [
        '--host', NEON_DB.host,
        '--port', NEON_DB.port.toString(),
        '--username', NEON_DB.user,
        '--no-password',
        '--dbname', NEON_DB.database,
        '-c', `
          SELECT table_name, (SELECT COUNT(*) FROM information_schema.tables t2 WHERE t2.table_name = t.table_name) as count
          FROM information_schema.tables t
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `,
      ], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          console.log('\n📊 Tables in Neon Database:');
          console.log(output);
          resolve();
        } else {
          console.warn('⚠️  Could not verify tables');
          resolve();
        }
      });
    });
  }

  async cleanup() {
    if (fs.existsSync(DUMP_FILE)) {
      fs.unlinkSync(DUMP_FILE);
      console.log(`\n🗑️  Cleaned up dump file: ${DUMP_FILE}`);
    }
  }

  async execute() {
    try {
      await this.dumpLocalDatabase();
      await this.restoreToneonDatabase();
      await this.verifyMigration();

      console.log('\n╔════════════════════════════════════════╗');
      console.log('║    MIGRATION COMPLETED SUCCESSFULLY  ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('\n📊 Migration Summary:');
      console.log(`   Source:  ${LOCAL_DB.host}:${LOCAL_DB.port}/${LOCAL_DB.database}`);
      console.log(`   Target:  ${NEON_DB.host}/${NEON_DB.database}`);
      console.log('   Method:  pg_dump + psql');
      console.log('\n✅ All data has been successfully migrated to Neon!');

    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Run migration
const migration = new PostgreSQLMigration();
migration.execute();
