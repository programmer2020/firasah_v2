/**
 * Sections Routes
 */

import { Router, Request, Response } from 'express';
import { getAllSections, getSectionById, createSection, updateSection, deleteSection } from '../services/sectionsService.js';
import { errorHandler } from '../middleware/auth.js';

const router = Router();

router.get('/', errorHandler, async (req: Request, res: Response) => {
  try {
    const sections = await getAllSections();
    res.status(200).json({ success: true, data: sections });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch sections', error: error.message });
  }
});

router.get('/:id', errorHandler, async (req: Request, res: Response) => {
  try {
    const section = await getSectionById(Number(req.params.id));
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    res.status(200).json({ success: true, data: section });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch section', error: error.message });
  }
});

router.post('/', errorHandler, async (req: Request, res: Response) => {
  try {
    const { section_name } = req.body;
    if (!section_name) return res.status(400).json({ success: false, message: 'Section name is required' });
    const section = await createSection({ section_name });
    res.status(201).json({ success: true, data: section, message: 'Section created successfully' });
  } catch (error: any) {
    // Handle duplicate key error
    if (error.message && error.message.includes('duplicate key')) {
      return res.status(409).json({ 
        success: false, 
        message: `Section "${req.body.section_name}" already exists. Please choose a different name.` 
      });
    }
    res.status(500).json({ success: false, message: 'Failed to create section', error: error.message });
  }
});

router.put('/:id', errorHandler, async (req: Request, res: Response) => {
  try {
    const section = await updateSection(Number(req.params.id), req.body);
    res.status(200).json({ success: true, data: section, message: 'Section updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update section', error: error.message });
  }
});

router.delete('/:id', errorHandler, async (req: Request, res: Response) => {
  try {
    await deleteSection(Number(req.params.id));
    res.status(200).json({ success: true, message: 'Section deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete section', error: error.message });
  }
});

export default router;
