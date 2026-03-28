/**
 * Grades Routes
 */

import { Router, Request, Response } from 'express';
import { getAllGrades, getGradeById, createGrade, updateGrade, deleteGrade } from '../services/gradesService.js';
import { errorHandler } from '../middleware/auth.js';

const router = Router();

router.get('/', errorHandler, async (req: Request, res: Response) => {
  try {
    const grades = await getAllGrades();
    res.status(200).json({ success: true, data: grades });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch grades', error: error.message });
  }
});

router.get('/:id', errorHandler, async (req: Request, res: Response) => {
  try {
    const grade = await getGradeById(Number(req.params.id));
    if (!grade) return res.status(404).json({ success: false, message: 'Grade not found' });
    res.status(200).json({ success: true, data: grade });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch grade', error: error.message });
  }
});

router.post('/', errorHandler, async (req: Request, res: Response) => {
  try {
    let { school_id, grade_name, grade_level } = req.body;
    
    // Validate required fields
    if (!school_id || !grade_name || grade_level === undefined || grade_level === null) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Convert grade_level to integer
    grade_level = parseInt(grade_level, 10);
    
    if (isNaN(grade_level)) {
      return res.status(400).json({ success: false, message: 'Grade level must be a valid number' });
    }

    const grade = await createGrade({ school_id, grade_name, grade_level });
    res.status(201).json({ success: true, data: grade, message: 'Grade created successfully' });
  } catch (error: any) {
    // Handle duplicate key error
    if (error.message && error.message.includes('duplicate key')) {
      return res.status(409).json({ 
        success: false, 
        message: `A grade with level ${req.body.grade_level} already exists for this school. Please choose a different level.` 
      });
    }
    res.status(500).json({ success: false, message: 'Failed to create grade', error: error.message });
  }
});

router.put('/:id', errorHandler, async (req: Request, res: Response) => {
  try {
    const grade = await updateGrade(Number(req.params.id), req.body);
    res.status(200).json({ success: true, data: grade, message: 'Grade updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update grade', error: error.message });
  }
});

router.delete('/:id', errorHandler, async (req: Request, res: Response) => {
  try {
    await deleteGrade(Number(req.params.id));
    res.status(200).json({ success: true, message: 'Grade deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete grade', error: error.message });
  }
});

export default router;
