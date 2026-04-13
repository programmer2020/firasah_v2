/**
 * Subjects Routes
 */

import { Router, Request, Response } from 'express';
import { getAllSubjects, getSubjectById, createSubject, updateSubject, deleteSubject } from '../services/subjectsService.js';
import { authenticate, AuthRequest, getTenantFilter } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const subjects = await getAllSubjects();
    res.status(200).json({ success: true, data: subjects });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch subjects', error: error.message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const subject = await getSubjectById(Number(req.params.id));
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.status(200).json({ success: true, data: subject });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch subject', error: error.message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { subject_name } = req.body;
    if (!subject_name) return res.status(400).json({ success: false, message: 'Subject name is required' });
    const subject = await createSubject({ subject_name }, req.user?.id);
    res.status(201).json({ success: true, data: subject, message: 'Subject created successfully' });
  } catch (error: any) {
    // Handle duplicate key error
    if (error.message && error.message.includes('duplicate key')) {
      return res.status(409).json({ 
        success: false, 
        message: `Subject "${req.body.subject_name}" already exists. Please choose a different name.` 
      });
    }
    res.status(500).json({ success: false, message: 'Failed to create subject', error: error.message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const subject = await updateSubject(Number(req.params.id), req.body);
    res.status(200).json({ success: true, data: subject, message: 'Subject updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update subject', error: error.message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await deleteSubject(Number(req.params.id));
    res.status(200).json({ success: true, message: 'Subject deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete subject', error: error.message });
  }
});

export default router;
