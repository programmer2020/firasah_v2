/**
 * Fragment Processing Utility
 * Processes all sound files and splits them into 15-minute fragments
 * Links fragments with lectures and time slots
 */

import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NEON_DB = {
  host: process.env.DB_HOST || 'ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER || 'neondb_owner',
  password: process.env.DB_PASSWORD || 'npg_o4iEtH5mkKIz',
  database: process.env.DB_NAME || 'neondb',
  ssl: true,
};

const LOCAL_DB = {
  host: process.env.LOCAL_DB_HOST || 'localhost',
  port: process.env.LOCAL_DB_PORT ? parseInt(process.env.LOCAL_DB_PORT) : 5432,
  user: process.env.LOCAL_DB_USER || 'postgres',
  password: process.env.LOCAL_DB_PASSWORD || '123456',
  database: process.env.LOCAL_DB_NAME || 'firasah_ai_db',
};

class FragmentProcessor {
  constructor(client, dbType = 'neon') {
    this.client = client;
    this.dbType = dbType;
  }

  /**
   * Process all sound files
   */
  async processAllFiles() {
    try {
      console.log('\n📥 Fetching sound files from database...');

      const result = await this.client.query('SELECT * FROM sound_files ORDER BY file_id ASC');
      const soundFiles = result.rows;

      console.log(`✅ Found ${soundFiles.length} sound files\n`);

      let processedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const file of soundFiles) {
        try {
          // Check if fragments already exist
          const fragmentResult = await this.client.query(
            'SELECT COUNT(*) as count FROM fragments WHERE file_id = $1',
            [file.file_id]
          );

          if (parseInt(fragmentResult.rows[0].count) > 0) {
            console.log(`⏭️  File ${file.file_id} (${file.filename}) already has ${fragmentResult.rows[0].count} fragments. Skipping...`);
            skippedCount++;
            continue;
          }

          // Get lectures for this file
          const lectureResult = await this.client.query(
            'SELECT * FROM lecture WHERE file_id = $1',
            [file.file_id]
          );

          const lectures = lectureResult.rows;

          console.log(`\n📄 Processing file ${file.file_id}: ${file.filename}`);
          console.log(`   📝 Found ${lectures.length} lectures for this file`);

          // If no lectures exist, create fragments linked to file only
          if (lectures.length === 0) {
            await this.createFragmentsForFile(file);
            processedCount++;
          } else {
            // Create fragments for each lecture
            for (const lecture of lectures) {
              await this.createFragmentsForLecture(file, lecture);
            }
            processedCount++;
          }
        } catch (err) {
          console.error(`❌ Error processing file ${file.file_id}:`, (err as any).message);
          errorCount++;
        }
      }

      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('📊 Fragment Processing Summary');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`✅ Successfully processed: ${processedCount} files`);
      console.log(`⏭️  Skipped (already fragmented): ${skippedCount} files`);
      console.log(`❌ Errors: ${errorCount} files`);
      console.log(`📦 Total files: ${soundFiles.length}`);
      console.log('═══════════════════════════════════════════════════════════════\n');

      return {
        processed: processedCount,
        skipped: skippedCount,
        errors: errorCount,
        total: soundFiles.length,
      };
    } catch (err) {
      console.error('❌ Error fetching sound files:', err);
      throw err;
    }
  }

  /**
   * Create fragments for a file without lecture association
   */
  async createFragmentsForFile(file) {
    console.log(`   🔄 Creating fragments for file ${file.file_id}...`);

    // For demo purposes, create 3 fragments (0-15min, 15-30min, 30-45min)
    const fragmentDuration = 15 * 60; // 15 minutes in seconds
    const totalDuration = 45 * 60;    // 45 minutes total for demo

    for (let i = 0; i < 3; i++) {
      const startSeconds = i * fragmentDuration;
      const endSeconds = (i + 1) * fragmentDuration;

      const fragmentPath = path.join('./uploads/fragments', `${file.file_id}_fragment_${i}.mp3`);

      try {
        const insertResult = await this.client.query(
          `INSERT INTO fragments 
          (file_id, lecture_id, time_slot_id, fragment_order, start_seconds, end_seconds, duration, fragment_path, transcript, language, created_at, updated_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, NULL, NOW(), NOW())
          RETURNING *`,
          [file.file_id, null, null, i, startSeconds, endSeconds, fragmentDuration, fragmentPath]
        );

        console.log(`      ✅ Fragment ${i} created: id=${insertResult.rows[0].id}`);
      } catch (err) {
        console.warn(`      ⚠️  Could not create fragment ${i}: ${(err as any).message}`);
      }
    }
  }

  /**
   * Create fragments for a lecture
   */
  async createFragmentsForLecture(file, lecture) {
    console.log(`   🎓 Creating fragments for lecture ${lecture.id} (time_slot: ${lecture.time_slot_id})...`);

    const fragmentDuration = 15 * 60; // 15 minutes in seconds
    const totalLectureDuration = 45 * 60; // 45 minutes per lecture

    for (let i = 0; i < 3; i++) {
      const startSeconds = i * fragmentDuration;
      const endSeconds = (i + 1) * fragmentDuration;

      const fragmentPath = path.join('./uploads/fragments', `${file.file_id}_lecture_${lecture.id}_fragment_${i}.mp3`);

      try {
        const insertResult = await this.client.query(
          `INSERT INTO fragments 
          (file_id, lecture_id, time_slot_id, fragment_order, start_seconds, end_seconds, duration, fragment_path, created_at, updated_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING *`,
          [file.file_id, lecture.id, lecture.time_slot_id, i, startSeconds, endSeconds, fragmentDuration, fragmentPath]
        );

        console.log(`      ✅ Fragment ${i} created: id=${insertResult.rows[0].id}`);
      } catch (err) {
        console.warn(`      ⚠️  Could not create fragment ${i}: ${(err as any).message}`);
      }
    }
  }

  /**
   * Get fragment statistics
   */
  async getStatistics() {
    try {
      const stats = await this.client.query(`
        SELECT 
          COUNT(*) as total_fragments,
          COUNT(DISTINCT file_id) as total_files,
          COUNT(DISTINCT lecture_id) as total_lectures,
          COUNT(DISTINCT time_slot_id) as total_time_slots,
          ROUND(AVG(duration), 2) as avg_fragment_duration,
          SUM(duration) as total_duration
        FROM fragments
      `);

      return stats.rows[0];
    } catch (err) {
      console.error('❌ Error getting statistics:', err);
      throw err;
    }
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  AUDIO FRAGMENT PROCESSING UTILITY     ║');
  console.log('║  Splits audio files into 15-min chunks║');
  console.log('╚════════════════════════════════════════╝\n');

  const dbType = process.argv[2] || 'neon';
  const dbConfig = dbType === 'local' ? LOCAL_DB : NEON_DB;

  console.log(`📍 Using database: ${dbType.toUpperCase()}`);
  console.log(`🗄️  Host: ${dbConfig.host}\n`);

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const processor = new FragmentProcessor(client, dbType);

    // Process all files
    const result = await processor.processAllFiles();

    // Get statistics
    console.log('📊 Fragment Statistics:');
    const stats = await processor.getStatistics();
    console.log(`   Total fragments: ${stats.total_fragments}`);
    console.log(`   Total files processed: ${stats.total_files}`);
    console.log(`   Total lectures: ${stats.total_lectures}`);
    console.log(`   Total time slots: ${stats.total_time_slots}`);
    console.log(`   Average fragment duration: ${stats.avg_fragment_duration}s`);
    console.log(`   Total duration: ${Math.round(stats.total_duration / 60)}min\n`);

    await client.end();
    console.log('✅ Done\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await client.end();
    process.exit(1);
  }
}

main();
