/**
 * Fragment Service
 * Handles audio file splitting into 15-minute fragments
 * and management of fragment records in the database
 */

import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { insert, getMany, getOne } from '../helpers/database.js';

// Interface for fragment metadata
interface Fragment {
  fragment_id?: number;
  file_id: number;
  lecture_id?: number;
  fragment_order: number;
  start_seconds: number;
  end_seconds: number;
  duration: number;
  fragment_path?: string;
  transcript?: string;
  language?: string;
}

/**
 * Split audio file into 15-minute fragments
 * @param filePath Path to the audio file
 * @param outputDir Directory to save fragment files
 * @returns Array of fragment metadata
 */
export const splitAudioIntoFragments = async (
  filePath: string,
  outputDir: string = './uploads/fragments'
): Promise<Fragment[]> => {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fragmentDuration = 15 * 60; // 15 minutes in seconds
    const fileBaseName = path.basename(filePath, path.extname(filePath));
    const fragments: Fragment[] = [];

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('[Fragment] Error getting file duration:', err);
        reject(err);
        return;
      }

      const totalDuration = metadata.format.duration || 0;
      const fragmentCount = Math.ceil(totalDuration / fragmentDuration);

      console.log(`[Fragment] Total duration: ${totalDuration}s, Fragment count: ${fragmentCount}`);

      let processedFragments = 0;

      // Generate fragments sequentially
      for (let i = 0; i < fragmentCount; i++) {
        const startSeconds = i * fragmentDuration;
        const endSeconds = Math.min((i + 1) * fragmentDuration, totalDuration);
        const duration = endSeconds - startSeconds;

        const fragmentFileName = `${fileBaseName}_fragment_${i}.mp3`;
        const fragmentPath = path.join(outputDir, fragmentFileName);

        ffmpeg(filePath)
          .setStartTime(startSeconds)
          .duration(duration)
          .output(fragmentPath)
          .on('end', () => {
            processedFragments++;
            console.log(`[Fragment] ✅ Fragment ${i} created: ${fragmentPath}`);

            fragments.push({
              fragment_order: i,
              start_seconds: startSeconds,
              end_seconds: endSeconds,
              duration: duration,
              fragment_path: fragmentPath,
            } as Fragment);

            if (processedFragments === fragmentCount) {
              resolve(fragments);
            }
          })
          .on('error', (err) => {
            console.error(`[Fragment] Error creating fragment ${i}:`, err);
            reject(err);
          })
          .run();
      }
    });
  });
};

/**
 * Create fragment records in database for a lecture
 * @param fileId Sound file ID
 * @param lectureId Lecture ID
 * @param fragments Fragment metadata array
 * @returns Array of created fragment records
 */
export const createFragmentRecords = async (
  fileId: number,
  lectureId: number | null,
  fragments: Fragment[]
): Promise<any[]> => {
  const createdFragments = [];

  for (const fragment of fragments) {
    try {
      const result = await insert('fragments', {
        file_id: fileId,
        lecture_id: lectureId,
        fragment_order: fragment.fragment_order,
        start_seconds: fragment.start_seconds,
        end_seconds: fragment.end_seconds,
        duration: fragment.duration,
        fragment_path: fragment.fragment_path,
        transcript: fragment.transcript || null,
        language: fragment.language || null,
        last_transcription_attempt_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      console.log(`[Fragment] ✅ Fragment record ${fragment.fragment_order} created: id=${result.fragment_id}`);
      createdFragments.push(result);
    } catch (err) {
      console.error(`[Fragment] ❌ Failed to create fragment record ${fragment.fragment_order}:`, err);
    }
  }

  return createdFragments;
};

/**
 * Get all fragments for a lecture
 */
export const getFragmentsByLectureId = async (lectureId: number) => {
  const query = `
    SELECT f.*, l.transcript as lecture_transcript
    FROM fragments f
    LEFT JOIN lecture l ON f.lecture_id = l.lecture_id
    WHERE f.lecture_id = $1
    ORDER BY f.fragment_order ASC
  `;
  return await getMany(query, [lectureId]);
};

/**
 * Get all fragments for a file
 */
export const getFragmentsByFileId = async (fileId: number) => {
  const query = `
    SELECT *
    FROM fragments
    WHERE file_id = $1
    ORDER BY fragment_order ASC
  `;
  return await getMany(query, [fileId]);
};

/**
 * Get fragments by time slot
 */
export const getFragmentsByTimeSlot = async (timeSlotId: number) => {
  const query = `
    SELECT f.*, ts.start_time, ts.end_time, ts.day_of_week
    FROM fragments f
    JOIN lecture l ON f.lecture_id = l.lecture_id
    LEFT JOIN section_time_slots ts ON l.time_slot_id = ts.time_slot_id
    WHERE l.time_slot_id = $1
    ORDER BY f.fragment_order ASC
  `;
  return await getMany(query, [timeSlotId]);
};

/**
 * Split and process a lecture audio file into fragments
 * @param fileId Sound file ID
 * @param filePath Path to audio file
 * @param lectureId Lecture ID (optional)
 * @returns Array of created fragment records
 */
export const processLectureFragments = async (
  fileId: number,
  filePath: string,
  lectureId?: number
): Promise<any[]> => {
  try {
    console.log(`[Fragment] Starting fragment processing for file_id=${fileId}`);

    // Split audio into 15-minute chunks
    const fragments = await splitAudioIntoFragments(filePath);
    console.log(`[Fragment] ✅ Split into ${fragments.length} fragments`);

    // Create database records
    const createdFragments = await createFragmentRecords(
      fileId,
      lectureId || null,
      fragments
    );

    console.log(`[Fragment] ✅ Created ${createdFragments.length} fragment records in database`);

    return createdFragments;
  } catch (err) {
    console.error(`[Fragment] ❌ Error processing lecture fragments:`, err);
    throw err;
  }
};

/**
 * Delete fragments for a file
 */
export const deleteFileFragments = async (fileId: number): Promise<number> => {
  const query = `DELETE FROM fragments WHERE file_id = $1`;
  const result = await getMany(query, [fileId]);
  return result.length;
};

/**
 * Get fragment statistics for a file
 */
export const getFragmentStatistics = async (fileId: number) => {
  const query = `
    SELECT 
      COUNT(*) as total_fragments,
      SUM(duration) as total_duration,
      MIN(start_seconds) as first_fragment_start,
      MAX(end_seconds) as last_fragment_end,
      ROUND(AVG(duration), 2) as avg_fragment_duration
    FROM fragments
    WHERE file_id = $1
  `;
  return await getOne(query, [fileId]);
};
