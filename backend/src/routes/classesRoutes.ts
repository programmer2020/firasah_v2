/**
 * Classes Routes
 */

import { Router, Request, Response } from 'express';
import { getAllClasses, getClassById, createClass, updateClass, deleteClass } from '../services/classesService.js';
import { authenticate, AuthRequest, getTenantFilter } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const classes = await getAllClasses();
    res.status(200).json({ success: true, data: classes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch classes', error: error.message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cls = await getClassById(Number(req.params.id));
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    res.status(200).json({ success: true, data: cls });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch class', error: error.message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { grade_id, section_id, class_name } = req.body;
    if (!grade_id || !section_id) return res.status(400).json({ success: false, message: 'Missing required fields' });
    const cls = await createClass({ grade_id, section_id, class_name }, req.user?.id);
    res.status(201).json({ success: true, data: cls, message: 'Class created successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create class', error: error.message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cls = await updateClass(Number(req.params.id), req.body);
    res.status(200).json({ success: true, data: cls, message: 'Class updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update class', error: error.message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await deleteClass(Number(req.params.id));
    res.status(200).json({ success: true, message: 'Class deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete class', error: error.message });
  }
});

export default router;
