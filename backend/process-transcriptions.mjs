#!/usr/bin/env node

/**
 * Transcription Processing CLI Utility
 * Processes all lectures across all sound files
 * Transcribes fragments and saves concatenated text to lecture records
 */

import { Pool } from 'pg';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const env = process.env;
const USE_NEON = process.argv[2] === 'neon' || !process.argv[2];
const DB_CONNECTION_STRING = USE_NEON
  ? env.NEON_DATABASE_URL
  : `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`;

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

class TranscriptionProcessor {
  constructor() {
    this.pool = new Pool({
      connectionString: DB_CONNECTION_STRING,
      max: 5,
    });
    this.stats = {
      total_lectures: 0,
      successfully_transcribed: 0,
      failed: 0,
      total_text_length: 0,
      start_time: Date.now(),
    };
  }

  /**
   * Connect to database
   */
  async connect() {
    try {
      await this.pool.query('SELECT NOW()');
      console.log(
        `✅ Connected to ${USE_NEON ? 'Neon Cloud Database' : 'Local PostgreSQL Database'}`
      );
    } catch (err) {
      console.error('❌ Database connection failed:', err);
      process.exit(1);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    await this.pool.end();
    console.log('✅ Database connection closed');
  }

  /**
   * Transcribe a single audio fragment
   */
  async transcribeFragment(fragmentPath) {
    try {
      if (!fs.existsSync(fragmentPath)) {
        console.warn(`⚠️  Fragment file not found: ${fragmentPath}`);
        return '';
      }

      const fileStream = fs.createReadStream(fragmentPath);

      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        language: 'ar',
        response_format: 'text',
      });

      const text = typeof transcription === 'string' ? transcription : transcription.text || '';
      return text;
    } catch (err) {
      console.error(`❌ Error transcribing ${fragmentPath}:`, err);
      return '';
    }
  }

  /**
   * Get ordered fragments for a lecture
   */
  async getFragmentsForLecture(lectureId) {
    const query = `
      SELECT f.id, f.fragment_order, f.fragment_path, f.lecture_id, f.file_id
      FROM fragments f
      WHERE f.lecture_id = $1
      ORDER BY f.fragment_order ASC
    `;
    const result = await this.pool.query(query, [lectureId]);
    return result.rows;
  }

  /**
   * Transcribe all fragments for a lecture and concatenate
   */
  async transcribeLectureFragments(lectureId) {
    const fragments = await this.getFragmentsForLecture(lectureId);

    if (fragments.length === 0) {
      console.warn(`⚠️  No fragments found for lecture ${lectureId}`);
      return '';
    }

    const transcripts = [];

    console.log(`📚 Transcribing ${fragments.length} fragments for lecture ${lectureId}...`);

    for (const fragment of fragments) {
      const text = await this.transcribeFragment(fragment.fragment_path);
      if (text) {
        transcripts.push(text);
      }
    }

    const fullTranscript = transcripts.join(' ').trim();
    return fullTranscript;
  }

  /**
   * Update lecture with transcribed text
   */
  async updateLectureTranscript(lectureId, transcript) {
    const query = `
      UPDATE lecture
      SET transcript = $1, language = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const result = await this.pool.query(query, [transcript, 'ar', lectureId]);
    return result.rows[0];
  }

  /**
   * Process a single lecture
   */
  async processLecture(lectureId) {
    try {
      console.log(`🔄 Processing lecture ${lectureId}...`);

      const transcript = await this.transcribeLectureFragments(lectureId);

      if (!transcript) {
        console.warn(`⚠️  No transcript generated for lecture ${lectureId}`);
        return false;
      }

      await this.updateLectureTranscript(lectureId, transcript);

      this.stats.successfully_transcribed++;
      this.stats.total_text_length += transcript.length;

      console.log(
        `✅ Lecture ${lectureId} transcribed: ${transcript.length} characters, ${transcript.split(' ').length} words`
      );

      return true;
    } catch (err) {
      console.error(`❌ Error processing lecture ${lectureId}:`, err);
      this.stats.failed++;
      return false;
    }
  }

  /**
   * Get all lectures that need transcription
   */
  async getAllLectures() {
    const query = `
      SELECT DISTINCT l.id, l.file_id
      FROM lecture l
      INNER JOIN fragments f ON l.id = f.lecture_id
      WHERE l.transcript IS NULL OR l.transcript = ''
      ORDER BY l.file_id ASC, l.id ASC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Process all lectures
   */
  async processAllLectures() {
    try {
      console.log('\n🌍 Starting transcription processing...\n');

      const lectures = await this.getAllLectures();
      this.stats.total_lectures = lectures.length;

      console.log(`📊 Found ${lectures.length} lectures to process\n`);

      if (lectures.length === 0) {
        console.log('✨ No lectures to process. All lectures are already transcribed!');
        return;
      }

      for (let i = 0; i < lectures.length; i++) {
        console.log(`\n[${i + 1}/${lectures.length}]`);
        await this.processLecture(lectures[i].id);
      }

      this.printStatistics();
    } catch (err) {
      console.error('❌ Error processing lectures:', err);
      throw err;
    }
  }

  /**
   * Print final statistics
   */
  printStatistics() {
    const duration = Date.now() - this.stats.start_time;
    const durationSeconds = Math.round(duration / 1000);
    const avgTime = this.stats.successfully_transcribed > 0 ? durationSeconds / this.stats.successfully_transcribed : 0;

    console.log('\n');
    console.log('═══════════════════════════════════════════════');
    console.log('📊 TRANSCRIPTION PROCESSING STATISTICS');
    console.log('═══════════════════════════════════════════════');
    console.log(`✅ Successfully processed: ${this.stats.successfully_transcribed}`);
    console.log(`❌ Failed: ${this.stats.failed}`);
    console.log(`📊 Total lectures: ${this.stats.total_lectures}`);
    console.log(`📝 Total text generated: ${this.stats.total_text_length} characters`);
    console.log(`⏱️  Total duration: ${durationSeconds}s`);
    console.log(`⏱️  Average per lecture: ${avgTime.toFixed(2)}s`);
    console.log('═══════════════════════════════════════════════\n');
  }
}

/**
 * Main execution
 */
async function main() {
  const processor = new TranscriptionProcessor();

  try {
    await processor.connect();
    await processor.processAllLectures();
    await processor.disconnect();
    console.log('✨ Transcription processing complete!\n');
  } catch (err) {
    console.error('❌ Fatal error:', err);
    await processor.disconnect();
    process.exit(1);
  }
}

main();
