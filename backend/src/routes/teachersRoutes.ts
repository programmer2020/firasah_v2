/**
 * Teachers Routes
 */

import { Router, Request, Response } from 'express';
import {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} from '../services/teachersService.js';
import { errorHandler } from '../middleware/auth.js';

const router = Router();

router.get('/', errorHandler, async (req: Request, res: Response) => {
  try {
    const teachers = await getAllTeachers();
    res.status(200).json({ success: true, data: teachers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch teachers', error: error.message });
  }
});

router.get('/:id', errorHandler, async (req: Request, res: Response) => {
  try {
    const teacher = await getTeacherById(Number(req.params.id));
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.status(200).json({ success: true, data: teacher });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch teacher', error: error.message });
  }
});

router.post('/', errorHandler, async (req: Request, res: Response) => {
  try {
    const { school_id, teacher_name, teacher_email, teacher_phone } = req.body;
    if (!school_id || !teacher_name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const teacher = await createTeacher({ school_id, teacher_name, teacher_email, teacher_phone });
    res.status(201).json({ success: true, data: teacher, message: 'Teacher created successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create teacher', error: error.message });
  }
});

router.put('/:id', errorHandler, async (req: Request, res: Response) => {
  try {
    const { teacher_name, teacher_email, teacher_phone } = req.body;
    const teacher = await updateTeacher(Number(req.params.id), { teacher_id: Number(req.params.id), school_id: 0, teacher_name, teacher_email, teacher_phone });
    res.status(200).json({ success: true, data: teacher, message: 'Teacher updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update teacher', error: error.message });
  }
});

router.delete('/:id', errorHandler, async (req: Request, res: Response) => {
  try {
    await deleteTeacher(Number(req.params.id));
    res.status(200).json({ success: true, message: 'Teacher deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete teacher', error: error.message });
  }
});

export default router;
