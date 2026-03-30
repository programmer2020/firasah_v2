/**
 * Sound Files Service
 * Handles CRUD operations for sound files metadata
 */

import { getOne, getMany, insert, update, deleteRecord, executeQuery } from '../helpers/database.js';

interface SoundFile {
  file_id?: number;
  filename: string;
  filepath: string;
  createdBy: string;
  note?: string;
  class_id?: number | null;
  day_of_week?: string | null;
  slot_date?: string | null;
  transcript?: string | null;
  transcript_language?: string | null;
  transcript_updated_at?: Date | null;
}

let ensureSoundFilesScheduleSchemaPromise: Promise<void> | null = null;

const ensureSoundFilesScheduleSchema = async () => {
  if (!ensureSoundFilesScheduleSchemaPromise) {
    ensureSoundFilesScheduleSchemaPromise = (async () => {
      await executeQuery(`
        ALTER TABLE IF EXISTS sound_files
          ADD COLUMN IF NOT EXISTS class_id INTEGER,
          ADD COLUMN IF NOT EXISTS day_of_week VARCHAR(10),
          ADD COLUMN IF NOT EXISTS slot_date DATE;
      `);
    })();
  }

  return ensureSoundFilesScheduleSchemaPromise;
};

const syncSoundFilesIdSequence = async () => {
  await executeQuery(`
    SELECT setval(
      pg_get_serial_sequence('sound_files', 'file_id'),
      COALESCE((SELECT MAX(file_id) FROM sound_files), 0) + 1,
      false
    );
  `);
};

/**
 * Get all sound files
 * @returns Promise with array of sound files
 */
export const getAllSoundFiles = async () => {
  try {
    const query = `
      SELECT
        sf.*,
        COALESCE(fragment_stats.total_fragments, 0) AS total_fragments,
        COALESCE(fragment_stats.failed_fragments, 0) AS failed_fragments,
        COALESCE(lecture_stats.total_lectures, 0) AS total_lectures,
        COALESCE(lecture_stats.completed_lectures, 0) AS completed_lectures,
        CASE
          WHEN COALESCE(fragment_stats.failed_fragments, 0) > 0 THEN 'partial'
          WHEN COALESCE(lecture_stats.total_lectures, 0) > 0
            AND COALESCE(lecture_stats.completed_lectures, 0) = COALESCE(lecture_stats.total_lectures, 0)
            THEN 'completed'
          WHEN COALESCE(fragment_stats.total_fragments, 0) > 0 OR COALESCE(lecture_stats.total_lectures, 0) > 0 THEN 'processing'
          ELSE 'uploaded'
        END AS status
      FROM sound_files sf
      LEFT JOIN (
        SELECT
          file_id,
          COUNT(*) AS total_fragments,
          COUNT(*) FILTER (
            WHERE transcript = '[transcription_failed]'
          ) AS failed_fragments
        FROM fragments
        GROUP BY file_id
      ) fragment_stats ON fragment_stats.file_id = sf.file_id
      LEFT JOIN (
        SELECT
          file_id,
          COUNT(*) AS total_lectures,
          COUNT(*) FILTER (
            WHERE transcript IS NOT NULL
              AND BTRIM(COALESCE(transcript, '')) <> ''
          ) AS completed_lectures
        FROM lecture
        GROUP BY file_id
      ) lecture_stats ON lecture_stats.file_id = sf.file_id
      ORDER BY sf.created_at DESC
    `;
    return await getMany(query);
  } catch (error) {
    console.error('Error fetching sound files:', error);
    throw error;
  }
};

/**
 * Get sound file by ID
 * @param fileId Sound file ID
 * @returns Promise with single sound file
 */
export const getSoundFileById = async (fileId: number) => {
  try {
    const query = `
      SELECT * FROM sound_files
      WHERE file_id = $1
    `;
    return await getOne(query, [fileId]);
  } catch (error) {
    console.error('Error fetching sound file:', error);
    throw error;
  }
};

/**
 * Create a new sound file
 * @param data Sound file data
 * @returns Promise with created sound file
 */
export const createSoundFile = async (data: SoundFile) => {
  try {
    if (!data.filename || !data.filepath || !data.createdBy) {
      throw new Error('filename, filepath, and createdBy are required');
    }

    await ensureSoundFilesScheduleSchema();

    const createRecord = () => insert('sound_files', {
      filename: data.filename,
      filepath: data.filepath,
      createdBy: data.createdBy,
      note: data.note || null,
      class_id: data.class_id ?? null,
      day_of_week: data.day_of_week ?? null,
      slot_date: data.slot_date ?? null,
    });

    // Keep SERIAL sequence aligned with imported/migrated data before insert.
    await syncSoundFilesIdSequence();

    try {
      return await createRecord();
    } catch (error: any) {
      if (error?.code === '23505' && error?.constraint === 'sound_files_pkey') {
        console.warn('[SoundFiles] Sequence mismatch detected. Resyncing and retrying insert...');
        await syncSoundFilesIdSequence();
        return await createRecord();
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating sound file:', error);
    throw error;
  }
};

/**
 * Update a sound file
 * @param fileId Sound file ID
 * @param data Data to update
 * @returns Promise with updated sound file
 */

/**
 * Update the aggregated transcript for a sound file
 * @param fileId Sound file ID
 * @param transcript Concatenated transcript text
 * @param language Detected or selected language code
 * @returns Promise with updated sound file
 */
export const updateSoundFileTranscript = async (
  fileId: number,
  transcript: string | null,
  language: string | null = 'ar'
) => {
  try {
    return await update('sound_files', {
      transcript,
      transcript_language: language,
      transcript_updated_at: transcript ? new Date() : null,
      updated_at: new Date(),
    }, 'file_id = $1', [fileId]);
  } catch (error) {
    console.error('Error updating sound file transcript:', error);
    throw error;
  }
};

export const updateSoundFile = async (fileId: number, data: Partial<SoundFile>) => {
  try {
    const updateData: Record<string, any> = {};
    
    if (data.filename) updateData.filename = data.filename;
    if (data.filepath) updateData.filepath = data.filepath;
    if (data.createdBy) updateData.createdBy = data.createdBy;
    if (data.note !== undefined) updateData.note = data.note;
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    return await update('sound_files', updateData, 'file_id = $1', [fileId]);
  } catch (error) {
    console.error('Error updating sound file:', error);
    throw error;
  }
};

/**
 * Delete a sound file
 * @param fileId Sound file ID
 * @returns Promise with deleted sound file
 */
export const deleteSoundFile = async (fileId: number) => {
  try {
    return await deleteRecord('sound_files', 'file_id = $1', [fileId]);
  } catch (error) {
    console.error('Error deleting sound file:', error);
    throw error;
  }
};

/**
 * Get sound files by creator
 * @param createdBy Creator username
 * @returns Promise with array of sound files
 */
export const getSoundFilesByCreator = async (createdBy: string) => {
  try {
    const query = `
      SELECT * FROM sound_files
      WHERE createdBy = $1
      ORDER BY created_at DESC
    `;
    return await getMany(query, [createdBy]);
  } catch (error) {
    console.error('Error fetching sound files by creator:', error);
    throw error;
  }
};
