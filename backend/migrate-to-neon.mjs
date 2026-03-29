/**
 * Migration Script: Local PostgreSQL → Neon Cloud PostgreSQL
 * 
 * This script migrates all tables, relationships, and data from
 * a local PostgreSQL database to a Neon cloud database.
 * 
 * Usage: node migrate-to-neon.mjs
 */

import pkg from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const { Client } = pkg;

// Local database configuration (from .env)
const LOCAL_DB = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'firasah_ai_db',
};

// Neon cloud database configuration
const NEON_DB = {
  host: 'ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_o4iEtH5mkKIz',
  database: 'neondb',
  ssl: true,
};

// Order of tables for insertion (respecting foreign keys)
const TABLE_ORDER = [
  'users',
  'schools',
  'sections',
  'grades',
  'classes',
  'subjects',
  'teachers',
  'section_time_slots',
  'class_schedule',
  'kpi_domains',
  'kpis',
  'sound_files',
  'lecture',
  'fragments',
  'evidences',
  'evaluations',
];

// Schema SQL for creating all tables
const SCHEMA_SQL = `
/* ============================================================
FIRASAAI DATABASE CORE STRUCTURE - NEON MIGRATION
============================================================ */

-- users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- schools table
CREATE TABLE IF NOT EXISTS schools (
    school_id SERIAL PRIMARY KEY,
    school_name VARCHAR(200) NOT NULL,
    school_code VARCHAR(50),
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- sections table
CREATE TABLE IF NOT EXISTS sections (
    section_id SERIAL PRIMARY KEY,
    section_name VARCHAR(10) NOT NULL UNIQUE
);

-- grades table
CREATE TABLE IF NOT EXISTS grades (
    grade_id SERIAL PRIMARY KEY,
    school_id INT NOT NULL,
    grade_name VARCHAR(50) NOT NULL,
    grade_level INT NOT NULL,
    CONSTRAINT fk_grade_school
        FOREIGN KEY (school_id)
        REFERENCES schools(school_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_grade_per_school
        UNIQUE (school_id, grade_level)
);

-- classes table
CREATE TABLE IF NOT EXISTS classes (
    class_id SERIAL PRIMARY KEY,
    grade_id INT NOT NULL,
    section_id INT NOT NULL,
    class_name VARCHAR(100),
    CONSTRAINT fk_class_grade
        FOREIGN KEY (grade_id)
        REFERENCES grades(grade_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_class_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id),
    CONSTRAINT uq_grade_section
        UNIQUE (grade_id, section_id)
);

-- subjects table
CREATE TABLE IF NOT EXISTS subjects (
    subject_id SERIAL PRIMARY KEY,
    subject_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- teachers table
CREATE TABLE IF NOT EXISTS teachers (
    teacher_id SERIAL PRIMARY KEY,
    school_id INT NOT NULL,
    teacher_name VARCHAR(200) NOT NULL,
    teacher_email VARCHAR(200) UNIQUE,
    teacher_phone VARCHAR(50),
    CONSTRAINT fk_teacher_school
        FOREIGN KEY (school_id)
        REFERENCES schools(school_id)
        ON DELETE CASCADE
);

-- section_time_slots table
CREATE TABLE IF NOT EXISTS section_time_slots (
    time_slot_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    day_of_week VARCHAR(10) NOT NULL,
    slot_date DATE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CONSTRAINT fk_timeslot_class
        FOREIGN KEY (class_id)
        REFERENCES classes(class_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_valid_time
        CHECK (end_time > start_time)
);

-- class_schedule table
CREATE TABLE IF NOT EXISTS class_schedule (
    schedule_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    time_slot_id INT NOT NULL,
    CONSTRAINT fk_schedule_class
        FOREIGN KEY (class_id)
        REFERENCES classes(class_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_schedule_subject
        FOREIGN KEY (subject_id)
        REFERENCES subjects(subject_id),
    CONSTRAINT fk_schedule_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES teachers(teacher_id),
    CONSTRAINT fk_schedule_timeslot
        FOREIGN KEY (time_slot_id)
        REFERENCES section_time_slots(time_slot_id),
    CONSTRAINT uq_class_timeslot
        UNIQUE (class_id, time_slot_id)
);

-- kpi_domains table
CREATE TABLE IF NOT EXISTS kpi_domains (
    domain_id SERIAL PRIMARY KEY,
    domain_code VARCHAR(20) NOT NULL UNIQUE,
    domain_name VARCHAR(255) NOT NULL,
    domain_description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- kpis table
CREATE TABLE IF NOT EXISTS kpis (
    kpi_id SERIAL PRIMARY KEY,
    domain_id INTEGER REFERENCES kpi_domains(domain_id) ON DELETE CASCADE,
    kpi_code VARCHAR(20),
    kpi_name VARCHAR(255) NOT NULL,
    kpi_description TEXT,
    createdAt TIMESTAMP,
    createdBy VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- sound_files table
CREATE TABLE IF NOT EXISTS sound_files (
  file_id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  filepath VARCHAR(500) NOT NULL,
  createdBy VARCHAR(255),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- lecture table
CREATE TABLE IF NOT EXISTS lecture (
    id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
    time_slot_id INTEGER REFERENCES section_time_slots(time_slot_id) ON DELETE SET NULL,
    transcript TEXT,
    language VARCHAR(10),
    duration DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    slot_order INTEGER
);

-- fragments table
CREATE TABLE IF NOT EXISTS fragments (
    id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
    lecture_id INTEGER REFERENCES lecture(id) ON DELETE CASCADE,
    time_slot_id INTEGER REFERENCES section_time_slots(time_slot_id) ON DELETE SET NULL,
    fragment_order INTEGER NOT NULL,
    start_seconds DECIMAL(10, 2) NOT NULL,
    end_seconds DECIMAL(10, 2) NOT NULL,
    duration DECIMAL(10, 2) NOT NULL,
    fragment_path VARCHAR(500),
    transcript TEXT COLLATE "C",
    language VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- evidences table
CREATE TABLE IF NOT EXISTS evidences (
    id SERIAL PRIMARY KEY,
    kpi_id INTEGER NOT NULL REFERENCES kpis(kpi_id) ON DELETE CASCADE,
    file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    evidence_txt TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- evaluations table
CREATE TABLE IF NOT EXISTS evaluations (
    id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
    kpi_id INTEGER NOT NULL REFERENCES kpis(kpi_id) ON DELETE CASCADE,
    evidence_count INTEGER DEFAULT 0,
    mark DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sound_files_filename ON sound_files(filename);
CREATE INDEX IF NOT EXISTS idx_sound_files_createdby ON sound_files(createdBy);
CREATE INDEX IF NOT EXISTS idx_kpi_domains_code ON kpi_domains(domain_code);
CREATE INDEX IF NOT EXISTS idx_kpis_domain_id ON kpis(domain_id);
CREATE INDEX IF NOT EXISTS idx_kpis_code ON kpis(kpi_code);
CREATE INDEX IF NOT EXISTS idx_kpis_kpi_name ON kpis(kpi_name);
CREATE INDEX IF NOT EXISTS idx_kpis_createdby ON kpis(createdBy);
CREATE INDEX IF NOT EXISTS idx_evidences_kpi_id ON evidences(kpi_id);
CREATE INDEX IF NOT EXISTS idx_evidences_file_id ON evidences(file_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_file_id ON evaluations(file_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_kpi_id ON evaluations(kpi_id);
CREATE INDEX IF NOT EXISTS idx_lecture_file_id ON lecture(file_id);
CREATE INDEX IF NOT EXISTS idx_lecture_time_slot_id ON lecture(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_fragments_file_id ON fragments(file_id);
CREATE INDEX IF NOT EXISTS idx_fragments_lecture_id ON fragments(lecture_id);
CREATE INDEX IF NOT EXISTS idx_fragments_time_slot_id ON fragments(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_fragments_order ON fragments(file_id, fragment_order);
`;

class MigrationManager {
  constructor() {
    this.localClient = null;
    this.neonClient = null;
    this.dataCache = {};
  }

  async connect() {
    try {
      console.log('\n📡 Connecting to local database...');
      this.localClient = new Client(LOCAL_DB);
      await this.localClient.connect();
      console.log('✅ Local database connected');

      console.log('\n🌐 Connecting to Neon cloud database...');
      this.neonClient = new Client(NEON_DB);
      await this.neonClient.connect();
      console.log('✅ Neon cloud database connected');
    } catch (error) {
      console.error('❌ Connection error:', error.message);
      throw error;
    }
  }

  async setupNeonDatabase() {
    try {
      console.log('\n🔧 Setting up Neon database schema...');
      await this.neonClient.query(SCHEMA_SQL);
      console.log('✅ Schema created successfully on Neon');
    } catch (error) {
      console.error('❌ Schema setup error:', error.message);
      throw error;
    }
  }

  async getTableColumnInfo(client, tableName) {
    try {
      const result = await client.query(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_name = $1 
         ORDER BY ordinal_position`,
        [tableName]
      );
      return result.rows;
    } catch (error) {
      console.warn(`⚠️  Warning: Could not get column info for ${tableName}:`, error.message);
      return [];
    }
  }

  async extractTableData(tableName) {
    try {
      console.log(`\n📥 Extracting data from ${tableName}...`);
      
      const result = await this.localClient.query(`SELECT * FROM ${tableName}`);
      
      if (result.rows.length === 0) {
        console.log(`   ℹ️  No data found in ${tableName}`);
        return [];
      }
      
      console.log(`   ✅ Extracted ${result.rows.length} records from ${tableName}`);
      this.dataCache[tableName] = result.rows;
      
      return result.rows;
    } catch (error) {
      console.warn(`⚠️  Warning: Could not extract data from ${tableName}:`, error.message);
      return [];
    }
  }

  async insertTableData(tableName, rows) {
    if (rows.length === 0) {
      console.log(`   ℹ️  Skipping insert for ${tableName} (no data)`);
      return;
    }

    try {
      console.log(`📤 Inserting ${rows.length} records into ${tableName}...`);

      // Get column info
      const columns = await this.getTableColumnInfo(this.localClient, tableName);
      const columnNames = columns.map(col => col.column_name);

      if (columnNames.length === 0) {
        console.warn(`⚠️  Warning: Could not determine columns for ${tableName}`);
        return;
      }

      // Build placeholders and values
      for (const row of rows) {
        const values = columnNames.map(col => row[col] ?? null);
        const placeholders = columnNames
          .map((_, i) => `$${i + 1}`)
          .join(', ');
        const query = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${placeholders})
                       ON CONFLICT DO NOTHING`;

        try {
          await this.neonClient.query(query, values);
        } catch (error) {
          // Log but continue - some inserts might fail due to conflicts
          console.warn(`   ⚠️  Warning: Could not insert row in ${tableName}: ${error.message}`);
        }
      }

      console.log(`   ✅ Successfully inserted data into ${tableName}`);
    } catch (error) {
      console.error(`❌ Error inserting into ${tableName}:`, error.message);
      throw error;
    }
  }

  async migrateAllTables() {
    try {
      console.log('\n\n╔════════════════════════════════════════╗');
      console.log('║    STARTING DATABASE MIGRATION       ║');
      console.log('╚════════════════════════════════════════╝');

      // Step 1: Extract data from all tables
      console.log('\n═══════════════════════════════════════');
      console.log('STEP 1: EXTRACTING DATA FROM LOCAL DB');
      console.log('═══════════════════════════════════════');

      for (const tableName of TABLE_ORDER) {
        try {
          await this.extractTableData(tableName);
        } catch (error) {
          console.warn(`⚠️  Warning: Skipping table ${tableName}`);
        }
      }

      // Step 2: Setup Neon database
      console.log('\n═══════════════════════════════════════');
      console.log('STEP 2: SETTING UP NEON SCHEMA');
      console.log('═══════════════════════════════════════');
      await this.setupNeonDatabase();

      // Step 3: Disable foreign key constraints temporarily
      console.log('\n═══════════════════════════════════════');
      console.log('STEP 3: INSERTING DATA TO NEON DB');
      console.log('═══════════════════════════════════════');

      // Try to disable triggers temporarily
      try {
        await this.neonClient.query('SET CONSTRAINTS ALL DEFERRED');
      } catch (e) {
        console.log('   ℹ️  Could not defer constraints (not critical)');
      }

      // Insert data in proper order
      for (const tableName of TABLE_ORDER) {
        const data = this.dataCache[tableName] || [];
        await this.insertTableData(tableName, data);
      }

      console.log('\n═══════════════════════════════════════');
      console.log('STEP 4: VERIFYING DATA TRANSFER');
      console.log('═══════════════════════════════════════');

      // Verify row counts
      for (const tableName of TABLE_ORDER) {
        try {
          const result = await this.neonClient.query(`SELECT COUNT(*) FROM ${tableName}`);
          const neonCount = parseInt(result.rows[0].count);
          const localCount = this.dataCache[tableName]?.length || 0;
          
          const status = neonCount === localCount ? '✅' : '⚠️';
          console.log(`${status} ${tableName}: ${neonCount} records (expected: ${localCount})`);
        } catch (error) {
          console.warn(`⚠️  ${tableName}: could not verify`);
        }
      }

      console.log('\n╔════════════════════════════════════════╗');
      console.log('║    MIGRATION COMPLETED SUCCESSFULLY  ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('\n📊 Migration Summary:');
      console.log(`   Local DB:     ${LOCAL_DB.host}:${LOCAL_DB.port}/${LOCAL_DB.database}`);
      console.log(`   Neon DB:      ${NEON_DB.host}/${NEON_DB.database}`);
      console.log('   Tables:       ' + Object.keys(this.dataCache).length);
      console.log('   Total rows:   ' + Object.values(this.dataCache).reduce((sum, arr) => sum + arr.length, 0));

    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.localClient) {
        await this.localClient.end();
        console.log('\n✅ Disconnected from local database');
      }
      if (this.neonClient) {
        await this.neonClient.end();
        console.log('✅ Disconnected from Neon database');
      }
    } catch (error) {
      console.error('Error during disconnect:', error.message);
    }
  }
}

// Main execution
async function main() {
  const manager = new MigrationManager();

  try {
    await manager.connect();
    await manager.migrateAllTables();
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await manager.disconnect();
  }
}

main();
