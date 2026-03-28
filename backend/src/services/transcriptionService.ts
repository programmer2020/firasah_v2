/**
 * Transcription Service
 * Handles speech-to-text conversion and concatenation of audio fragments
 * Orchestrates Whisper API calls and database updates
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { getMany, getOne, update } from '../helpers/database.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface FragmentWithOrder {
  id: number;
  fragment_order: number;
  fragment_path: string;
  lecture_id: number;
  file_id: number;
}

/**
 * Transcribe a single audio fragment using OpenAI Whisper API
 * @param fragmentPath Path to the audio file
 * @returns Transcribed text
 */
export const transcribeFragment = async (fragmentPath: string): Promise<string> => {
  try {
    if (!fs.existsSync(fragmentPath)) {
      console.warn(`[Transcription] ⚠️  Fragment file not found: ${fragmentPath}`);
      return '';
    }

    console.log(`[Transcription] 🎤 Transcribing fragment: ${path.basename(fragmentPath)}`);

    const fileStream = fs.createReadStream(fragmentPath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      language: 'ar', // Arabic language
      response_format: 'text',
    }) as any;

    const text = typeof transcription === 'string' ? transcription : (transcription?.text as string) || '';
    
    console.log(`[Transcription] ✅ Fragment transcribed: ${text.substring(0, 50)}...`);
    
    return text;
  } catch (err) {
    console.error(`[Transcription] ❌ Error transcribing fragment ${fragmentPath}:`, err);
    return '';
  }
};

/**
 * Get all fragments for a lecture in order
 */
export const getLectureFragmentsOrdered = async (lectureId: number): Promise<FragmentWithOrder[]> => {
  const query = `
    SELECT f.id, f.fragment_order, f.fragment_path, f.lecture_id, f.file_id
    FROM fragments f
    WHERE f.lecture_id = $1
    ORDER BY f.fragment_order ASC
  `;
  return await getMany(query, [lectureId]);
};

/**
 * Transcribe all fragments for a lecture and concatenate text
 * @param lectureId Lecture ID
 * @returns Concatenated transcript
 */
export const transcribeLectureFragments = async (lectureId: number): Promise<string> => {
  try {
    console.log(`[Transcription] 📚 Starting transcription for lecture ${lectureId}...`);

    // Get all fragments for this lecture in order
    const fragments = await getLectureFragmentsOrdered(lectureId);

    if (fragments.length === 0) {
      console.warn(`[Transcription] ⚠️  No fragments found for lecture ${lectureId}`);
      return '';
    }

    console.log(`[Transcription] Found ${fragments.length} fragments to transcribe`);

    const transcripts: string[] = [];

    // Transcribe each fragment in order
    for (const fragment of fragments) {
      const text = await transcribeFragment(fragment.fragment_path);
      if (text) {
        transcripts.push(text);
      }
    }

    // Concatenate all transcripts with proper spacing
    const fullTranscript = transcripts.join(' ').trim();

    console.log(`[Transcription] ✅ Lecture transcription complete: ${fullTranscript.length} characters`);

    return fullTranscript;
  } catch (err) {
    console.error(`[Transcription] ❌ Error transcribing lecture fragments:`, err);
    throw err;
  }
};

/**
 * Update lecture record with transcribed text
 */
export const updateLectureTranscript = async (
  lectureId: number,
  transcript: string,
  language: string = 'ar'
): Promise<any> => {
  try {
    const query = `
      UPDATE lecture
      SET transcript = $1, language = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const result = await getOne(query, [transcript, language, lectureId]);

    console.log(`[Transcription] ✅ Lecture ${lectureId} transcript updated: ${transcript.length} chars`);

    return result;
  } catch (err) {
    console.error(`[Transcription] ❌ Error updating lecture transcript:`, err);
    throw err;
  }
};

/**
 * Process a complete lecture: transcribe all fragments and save to database
 * @param lectureId Lecture ID
 * @param language Language code (default: 'ar' for Arabic)
 * @returns Updated lecture record
 */
export const processLectureTranscription = async (
  lectureId: number,
  language: string = 'ar'
): Promise<any> => {
  try {
    console.log(`[Transcription] 🔄 Processing transcription for lecture ${lectureId}`);

    // Transcribe all fragments and concatenate
    const fullTranscript = await transcribeLectureFragments(lectureId);

    if (!fullTranscript) {
      throw new Error(`No transcript generated for lecture ${lectureId}`);
    }

    // Update lecture record
    const updatedLecture = await updateLectureTranscript(lectureId, fullTranscript, language);

    console.log(`[Transcription] ✅ Lecture ${lectureId} processing complete`);

    return updatedLecture;
  } catch (err) {
    console.error(`[Transcription] ❌ Error processing lecture transcription:`, err);
    throw err;
  }
};

/**
 * Process all lectures for a sound file
 * @param fileId Sound file ID
 * @returns Array of updated lecture records
 */
export const processFileTranscriptions = async (fileId: number): Promise<any[]> => {
  try {
    console.log(`[Transcription] 📁 Processing all lectures for file ${fileId}...`);

    // Get all lectures for this file
    const query = `SELECT id FROM lecture WHERE file_id = $1`;
    const lectures = await getMany(query, [fileId]);

    console.log(`[Transcription] Found ${lectures.length} lectures for file ${fileId}`);

    const results = [];

    // Process each lecture
    for (const lecture of lectures) {
      try {
        const result = await processLectureTranscription(lecture.id);
        results.push({
          lecture_id: lecture.id,
          status: 'success',
          transcript_length: result.transcript?.length || 0,
        });
      } catch (err) {
        console.error(`[Transcription] ❌ Error processing lecture ${lecture.id}:`, err);
        results.push({
          lecture_id: lecture.id,
          status: 'error',
          error: (err as any).message,
        });
      }
    }

    console.log(`[Transcription] ✅ File transcription complete: ${results.length} lectures processed`);

    return results;
  } catch (err) {
    console.error(`[Transcription] ❌ Error processing file transcriptions:`, err);
    throw err;
  }
};

/**
 * Process all lectures across all files
 * @returns Summary statistics
 */
export const processAllTranscriptions = async (): Promise<{ total: number; successful: number; failed: number; results: any[] }> => {
  try {
    console.log(`[Transcription] 🌍 Processing all lectures...`);

    // Get all unique sound files that have lectures
    const query = `
      SELECT DISTINCT l.file_id
      FROM lecture l
      ORDER BY l.file_id ASC
    `;
    const files = await getMany(query, []);

    console.log(`[Transcription] Found ${files.length} files with lectures`);

    const results = [];
    let totalSuccessful = 0;
    let totalFailed = 0;

    // Process each file
    for (const file of files) {
      try {
        const fileResults = await processFileTranscriptions(file.file_id);
        
        for (const result of fileResults) {
          if (result.status === 'success') {
            totalSuccessful++;
          } else {
            totalFailed++;
          }
        }
        
        results.push(...fileResults);
      } catch (err) {
        console.error(`[Transcription] ❌ Error processing file ${file.file_id}:`, err);
        totalFailed++;
      }
    }

    console.log(`[Transcription] ✅ All transcriptions complete`);

    return {
      total: results.length,
      successful: totalSuccessful,
      failed: totalFailed,
      results,
    };
  } catch (err) {
    console.error(`[Transcription] ❌ Error processing all transcriptions:`, err);
    throw err;
  }
};

/**
 * Get lecture with full transcript
 */
export const getLectureWithTranscript = async (lectureId: number): Promise<any> => {
  const query = `
    SELECT l.*, sf.filename, ts.start_time, ts.end_time, ts.day_of_week
    FROM lecture l
    JOIN sound_files sf ON l.file_id = sf.file_id
    LEFT JOIN section_time_slots ts ON l.time_slot_id = ts.time_slot_id
    WHERE l.id = $1
  `;
  return await getOne(query, [lectureId]);
};

/**
 * Get all lectures for a file with transcripts
 */
export const getFileTranscriptions = async (fileId: number): Promise<any[]> => {
  const query = `
    SELECT l.*, sf.filename, ts.start_time, ts.end_time, ts.day_of_week
    FROM lecture l
    JOIN sound_files sf ON l.file_id = sf.file_id
    LEFT JOIN section_time_slots ts ON l.time_slot_id = ts.time_slot_id
    WHERE l.file_id = $1
    ORDER BY l.id ASC
  `;
  return await getMany(query, [fileId]);
};

/**
 * Check transcription status for a lecture
 */
export const getTranscriptionStatus = async (lectureId: number): Promise<any> => {
  const query = `
    SELECT l.id, l.file_id, l.transcript, l.language, 
           (SELECT COUNT(*) FROM fragments WHERE lecture_id = $1) as fragment_count,
           (SELECT SUM(duration) FROM fragments WHERE lecture_id = $1)::DECIMAL as total_duration,
           CASE 
             WHEN l.transcript IS NOT NULL AND l.transcript != '' THEN 'completed'
             ELSE 'pending'
           END as status,
           l.created_at, l.updated_at
    FROM lecture l
    WHERE l.id = $1
  `;
  return await getOne(query, [lectureId]);
};

/**
 * Clear transcript from lecture (for re-transcription)
 */
export const clearLectureTranscript = async (lectureId: number): Promise<any> => {
  const query = `
    UPDATE lecture
    SET transcript = NULL, language = NULL, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  return await getOne(query, [lectureId]);
};

/**
 * Get transcript statistics
 */
export const getTranscriptionStatistics = async (): Promise<any> => {
  const query = `
    SELECT 
      COUNT(*) as total_lectures,
      COUNT(CASE WHEN transcript IS NOT NULL THEN 1 END) as transcribed_lectures,
      COUNT(CASE WHEN transcript IS NULL THEN 1 END) as pending_lectures,
      ROUND(AVG(LENGTH(transcript))::NUMERIC, 2) as avg_transcript_length,
      MAX(LENGTH(transcript)) as longest_transcript,
      MIN(LENGTH(transcript)) as shortest_transcript,
      SUM(LENGTH(transcript)) as total_text_length
    FROM lecture
  `;
  return await getOne(query, []);
};
