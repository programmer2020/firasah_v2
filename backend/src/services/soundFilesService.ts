/**
 * Sound Files Service
 * Handles CRUD operations for sound files metadata
 */

import { getOne, getMany, insert, update, deleteRecord } from '../helpers/database.js';

interface SoundFile {
  file_id?: number;
  filename: string;
  filepath: string;
  createdAt?: string;
  createdBy: string;
  note?: string;
}

/**
 * Get all sound files
 * @returns Promise with array of sound files
 */
export const getAllSoundFiles = async () => {
  try {
    const query = `
      SELECT * FROM sound_files
      ORDER BY createdAt DESC
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

    return await insert('sound_files', {
      filename: data.filename,
      filepath: data.filepath,
      createdAt: new Date(),
      createdBy: data.createdBy,
      note: data.note || null,
    });
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
      ORDER BY createdAt DESC
    `;
    return await getMany(query, [createdBy]);
  } catch (error) {
    console.error('Error fetching sound files by creator:', error);
    throw error;
  }
};
