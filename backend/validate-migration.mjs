#!/usr/bin/env node
/**
 * Pre-Migration Validation Script
 * Checks all prerequisites before running migration
 * 
 * Usage: node validate-migration.mjs
 */

import pkg from 'pg';
import { execSync } from 'child_process';
import * as fs from 'fs';

const { Client } = pkg;

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
  ssl: true,
};

class ValidationChecker {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
    };
  }

  async checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.split('.')[0].substring(1));
    
    if (major >= 14) {
      this.results.passed.push(`✅ Node.js version: ${version} (required: 14+)`);
      return true;
    } else {
      this.results.failed.push(`❌ Node.js version: ${version} (required: 14+)`);
      return false;
    }
  }

  async checkLocalDatabase() {
    try {
      console.log('\n🔍 Checking local database connection...');
      const client = new Client(LOCAL_DB);
      await client.connect();

      // Get table count
      const result = await client.query(`
        SELECT COUNT(*) as table_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);

      const tableCount = result.rows[0].table_count;
      
      // Get total row count
      const rowResult = await client.query(`
        SELECT 
          COALESCE(SUM(CAST(
            regexp_replace(reltuples::text, E'^([0-9.]+).*', E'\\\\1')
          AS NUMERIC)), 0) as row_count
        FROM pg_class
        WHERE schemaname = 'public'
      `);

      const rowCount = rowResult.rows[0].row_count;

      await client.end();

      this.results.passed.push(
        `✅ Local database connected: ${LOCAL_DB.host}:${LOCAL_DB.port}/${LOCAL_DB.database}`
      );
      this.results.passed.push(
        `   📊 Tables: ${tableCount}, Estimated rows: ${Math.round(rowCount)}`
      );
      
      return true;
    } catch (error) {
      this.results.failed.push(
        `❌ Local database connection failed: ${error.message}`
      );
      return false;
    }
  }

  async checkNeonDatabase() {
    try {
      console.log('\n🔍 Checking Neon database connection...');
      const client = new Client(NEON_DB);
      await client.connect();

      const result = await client.query('SELECT version()');
      const version = result.rows[0].version;

      await client.end();

      this.results.passed.push(
        `✅ Neon database connected: ${NEON_DB.host}/${NEON_DB.database}`
      );
      this.results.passed.push(
        `   🗄️  PostgreSQL: ${version.split(' ')[1]}`
      );
      
      return true;
    } catch (error) {
      this.results.failed.push(
        `❌ Neon database connection failed: ${error.message}`
      );
      return false;
    }
  }

  checkMigrationScripts() {
    console.log('\n🔍 Checking migration scripts...');
    
    const scripts = [
      'migrate-to-neon.mjs',
      'migrate-pg-dump.mjs',
      'NEON_MIGRATION_GUIDE.md',
    ];

    for (const script of scripts) {
      if (fs.existsSync(script)) {
        this.results.passed.push(`✅ Found: ${script}`);
      } else {
        this.results.failed.push(`❌ Missing: ${script}`);
      }
    }
  }

  checkNetworkAccess() {
    console.log('\n🔍 Checking network access...');
    
    try {
      // Simple DNS lookup test for Neon
      execSync(`ping -c 1 ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech`, {
        stdio: 'pipe',
        timeout: 5000,
      });
      this.results.passed.push(`✅ Network access to Neon: OK`);
      return true;
    } catch (error) {
      this.results.warnings.push(
        `⚠️  Could not verify network access (firewall may block ICMP)`
      );
      return true; // Not a fatal error, might work anyway
    }
  }

  checkPGTools() {
    console.log('\n🔍 Checking PostgreSQL CLI tools...');
    
    const tools = ['pg_dump', 'psql'];
    let allFound = true;

    for (const tool of tools) {
      try {
        execSync(`${tool} --version`, { stdio: 'pipe' });
        this.results.passed.push(`✅ Found: ${tool}`);
      } catch (error) {
        if (tool === 'pg_dump') {
          this.results.warnings.push(
            `⚠️  ${tool} not found (not required for Node.js migration)`
          );
        } else {
          this.results.warnings.push(
            `⚠️  ${tool} not found (not required for Node.js migration)`
          );
        }
      }
    }
  }

  async checkEnvironmentFile() {
    console.log('\n🔍 Checking environment configuration...');
    
    if (fs.existsSync('.env')) {
      const content = fs.readFileSync('.env', 'utf-8');
      
      if (content.includes('DB_HOST') && content.includes('DB_PASSWORD')) {
        this.results.passed.push(`✅ .env file exists and configured`);
      } else {
        this.results.warnings.push(`⚠️  .env file exists but might be incomplete`);
      }
    } else {
      this.results.warnings.push(`⚠️  .env file not found (will be needed after migration)`);
    }
  }

  async run() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   MIGRATION VALIDATION CHECKER       ║');
    console.log('╚════════════════════════════════════════╝');

    console.log('\n📋 Checking prerequisites...');

    // Run all checks
    await this.checkNodeVersion();
    await this.checkLocalDatabase();
    await this.checkNeonDatabase();
    this.checkMigrationScripts();
    this.checkNetworkAccess();
    this.checkPGTools();
    await this.checkEnvironmentFile();

    // Display results
    console.log('\n═══════════════════════════════════════════');
    console.log('VALIDATION RESULTS');
    console.log('═══════════════════════════════════════════\n');

    if (this.results.passed.length > 0) {
      console.log('✅ PASSED CHECKS:');
      this.results.passed.forEach(msg => console.log(`   ${msg}`));
    }

    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.warnings.forEach(msg => console.log(`   ${msg}`));
    }

    if (this.results.failed.length > 0) {
      console.log('\n❌ FAILED CHECKS:');
      this.results.failed.forEach(msg => console.log(`   ${msg}`));
    }

    // Summary
    console.log('\n═══════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════\n');

    const total = this.results.passed.length + this.results.failed.length;
    const passed = this.results.passed.length;
    const failed = this.results.failed.length;

    console.log(`Total Checks: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Warnings: ${this.results.warnings.length} ⚠️`);

    if (failed === 0) {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║   ✅ READY FOR MIGRATION!           ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('\n📌 Next steps:');
      console.log('   1. Backup your local database (pg_dump)');
      console.log('   2. Run: node migrate-to-neon.mjs');
      console.log('   3. Verify migration with NEON_MIGRATION_GUIDE.md');
      console.log('   4. Update .env with Neon credentials');
      console.log('\n');
      return true;
    } else {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║   ❌ MIGRATION NOT READY              ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('\n⚠️  Please fix the failed checks above\n');
      return false;
    }
  }
}

// Run validation
const checker = new ValidationChecker();
const isReady = await checker.run();
process.exit(isReady ? 0 : 1);
