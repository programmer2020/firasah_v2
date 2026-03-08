import { Router, Request, Response } from 'express';
import {
  getAllClasses,
  getAllTeachers,
  getAllSubjects,
  getTimeSlotsByClass,
  createTimeSlot,
  deleteTimeSlot,
  assignSchedule,
  removeSchedule,
  getFullSchedule,
} from '../services/scheduleService.js';

const router = Router();

// ── Lookups ─────────────────────────────────────────────

router.get('/classes', async (_req: Request, res: Response) => {
  try {
    const classes = await getAllClasses();
    res.json(classes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/teachers', async (_req: Request, res: Response) => {
  try {
    const teachers = await getAllTeachers();
    res.json(teachers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/subjects', async (_req: Request, res: Response) => {
  try {
    const subjects = await getAllSubjects();
    res.json(subjects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Time Slots ──────────────────────────────────────────

router.get('/time-slots/:classId', async (req: Request, res: Response) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    const slots = await getTimeSlotsByClass(classId);
    res.json(slots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/time-slots', async (req: Request, res: Response) => {
  try {
    const { class_id, day_of_week, start_time, end_time, slot_date } = req.body;
    if (!class_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ error: 'class_id, day_of_week, start_time, end_time are required' });
    }
    const slot = await createTimeSlot({ class_id, day_of_week, start_time, end_time, slot_date });
    res.status(201).json(slot);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/time-slots/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await deleteTimeSlot(id);
    if (!deleted) return res.status(404).json({ error: 'Time slot not found' });
    res.json({ message: 'Time slot deleted', deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Schedule Assignment ─────────────────────────────────

router.get('/:classId', async (req: Request, res: Response) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    const schedule = await getFullSchedule(classId);
    res.json(schedule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/assign', async (req: Request, res: Response) => {
  try {
    const { class_id, time_slot_id, subject_id, teacher_id } = req.body;
    if (!class_id || !time_slot_id || !subject_id || !teacher_id) {
      return res.status(400).json({ error: 'class_id, time_slot_id, subject_id, teacher_id are required' });
    }
    const entry = await assignSchedule({ class_id, time_slot_id, subject_id, teacher_id });
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/assign/:scheduleId', async (req: Request, res: Response) => {
  try {
    const scheduleId = parseInt(req.params.scheduleId, 10);
    const deleted = await removeSchedule(scheduleId);
    if (!deleted) return res.status(404).json({ error: 'Schedule entry not found' });
    res.json({ message: 'Schedule entry removed', deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
