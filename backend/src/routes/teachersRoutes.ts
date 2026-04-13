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
import { authenticate, AuthRequest, getTenantFilter } from '../middleware/auth.js';
import { getMany } from '../helpers/database.js';

const router = Router();

/**
 * GET /api/teachers/logins
 * Get teacher logins (account creations) for a date range
 */
router.get('/logins/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate query parameters are required',
      });
    }

    const start = new Date(String(startDate));
    const end = new Date(String(endDate));

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T00:00:00Z)',
      });
    }

    // Get teacher logins by joining users with teachers table
    const teacherLogins = await getMany(
      `SELECT DISTINCT t.teacher_id, t.teacher_name, t.teacher_email, u.created_at
       FROM teachers t
       INNER JOIN users u ON LOWER(TRIM(t.teacher_email)) = LOWER(TRIM(u.email))
       WHERE u.created_at >= $1 AND u.created_at < $2
       ORDER BY u.created_at DESC`,
      [start.toISOString(), end.toISOString()]
    );

    res.status(200).json({
      success: true,
      count: teacherLogins.length,
      data: teacherLogins,
    });
  } catch (error: any) {
    console.error('Error fetching teacher logins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher logins',
      error: error.message,
    });
  }
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const teachers = await getAllTeachers();
    res.status(200).json({ success: true, data: teachers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch teachers', error: error.message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const teacher = await getTeacherById(Number(req.params.id));
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.status(200).json({ success: true, data: teacher });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch teacher', error: error.message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { school_id, teacher_name, teacher_email, teacher_phone } = req.body;
    if (!school_id || !teacher_name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const teacher = await createTeacher({ school_id, teacher_name, teacher_email, teacher_phone }, req.user?.id);
    res.status(201).json({ success: true, data: teacher, message: 'Teacher created successfully' });
  } catch (error: any) {
    // Handle duplicate key error
    if (error.message && error.message.includes('duplicate key')) {
      return res.status(409).json({ 
        success: false, 
        message: `Teacher email \"${req.body.teacher_email}\" is already in use. Please choose a different email.` 
      });
    }
    res.status(500).json({ success: false, message: 'Failed to create teacher', error: error.message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { teacher_name, teacher_email, teacher_phone } = req.body;
    const teacher = await updateTeacher(Number(req.params.id), { teacher_id: Number(req.params.id), school_id: 0, teacher_name, teacher_email, teacher_phone });
    res.status(200).json({ success: true, data: teacher, message: 'Teacher updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update teacher', error: error.message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await deleteTeacher(Number(req.params.id));
    res.status(200).json({ success: true, message: 'Teacher deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete teacher', error: error.message });
  }
});

export default router;
