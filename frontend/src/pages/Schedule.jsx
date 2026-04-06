import { useState, useEffect } from 'react';
import ProtectedLayout from '../components/ProtectedLayout';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import useAutoHideMessage from '../hooks/useAutoHideMessage';
import usePagination from '../hooks/usePagination';
import PaginationControls from '../components/PaginationControls';

const DAYS = [
  { key: 'Sunday', label: 'Sunday' },
  { key: 'Monday', label: 'Monday' },
  { key: 'Tuesday', label: 'Tuesday' },
  { key: 'Wednesday', label: 'Wednesday' },
  { key: 'Thursday', label: 'Thursday' },
];

export default function Schedule() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDay, setSelectedDay] = useState('Sunday');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Confirm modals
  const [showDeleteSlotModal, setShowDeleteSlotModal] = useState(false);
  const [deleteSlotId, setDeleteSlotId] = useState(null);
  const [showDeleteAssignModal, setShowDeleteAssignModal] = useState(false);
  const [deleteAssignId, setDeleteAssignId] = useState(null);

  // Time slot form
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotForm, setSlotForm] = useState({ start_time: '08:00', end_time: '08:45', subject_id: '' });

  // Assignment form
  const [assignForm, setAssignForm] = useState({ time_slot_id: '', subject_id: '', teacher_id: '' });
  const [showAssignForm, setShowAssignForm] = useState(false);

  // Load lookups
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [classesRes, teachersRes, subjectsRes] = await Promise.all([
          api.get('/api/schedule/classes'),
          api.get('/api/schedule/teachers'),
          api.get('/api/schedule/subjects'),
        ]);
        setClasses(classesRes.data);
        setTeachers(teachersRes.data);
        setSubjects(subjectsRes.data);
      } catch (err) {
        setError('Failed to load data');
      }
    };
    fetchLookups();
  }, []);

  // Load time slots when class changes
  useEffect(() => {
    if (selectedClass) {
      loadSlots();
    } else {
      setSlots([]);
    }
  }, [selectedClass]);

  const loadSlots = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/schedule/time-slots/${selectedClass}`);
      setSlots(res.data);
    } catch (err) {
      setError('Failed to load time slots');
    } finally {
      setLoading(false);
    }
  };

  const filteredSlots = slots.filter((s) => s.day_of_week === selectedDay);

  // Pagination
  const pagination = usePagination(filteredSlots, 10);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/schedule/time-slots', {
        class_id: parseInt(selectedClass),
        day_of_week: selectedDay,
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
        subject_id: parseInt(slotForm.subject_id),
      });
      setShowSlotForm(false);
      setSlotForm({ start_time: '08:00', end_time: '08:45', subject_id: '' });
      loadSlots();
    } catch (err) {
      setError('Failed to add time slot');
    }
  };

  const handleDeleteSlot = async () => {
    if (!deleteSlotId) return;
    try {
      await api.delete(`/api/schedule/time-slots/${deleteSlotId}`);
      loadSlots();
      setShowDeleteSlotModal(false);
      setDeleteSlotId(null);
    } catch (err) {
      setError('Failed to delete time slot');
      setShowDeleteSlotModal(false);
      setDeleteSlotId(null);
    }
  };

  const openDeleteSlotModal = (timeSlotId) => {
    setDeleteSlotId(timeSlotId);
    setShowDeleteSlotModal(true);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/schedule/assign', {
        class_id: parseInt(selectedClass),
        time_slot_id: parseInt(assignForm.time_slot_id),
        subject_id: parseInt(assignForm.subject_id),
        teacher_id: parseInt(assignForm.teacher_id),
      });
      setShowAssignForm(false);
      setAssignForm({ time_slot_id: '', subject_id: '', teacher_id: '' });
      loadSlots();
    } catch (err) {
      setError('Failed to assign subject and teacher');
    }
  };

  const handleRemoveAssignment = async () => {
    if (!deleteAssignId) return;
    try {
      await api.delete(`/api/schedule/assign/${deleteAssignId}`);
      loadSlots();
      setShowDeleteAssignModal(false);
      setDeleteAssignId(null);
    } catch (err) {
      setError('Failed to remove assignment');
      setShowDeleteAssignModal(false);
      setDeleteAssignId(null);
    }
  };

  const openDeleteAssignModal = (timeSlotId) => {
    setDeleteAssignId(timeSlotId);
    setShowDeleteAssignModal(true);
  };

  const openAssignForm = (slot) => {
    setAssignForm({
      time_slot_id: slot.time_slot_id,
      subject_id: slot.subject_id || '',
      teacher_id: slot.teacher_id || '',
    });
    setShowAssignForm(true);
  };

  const inputStyle = {
    border: '1.5px solid #a7f3d0',
    borderRadius: '10px',
    padding: '8px 14px',
    outline: 'none',
    minWidth: '180px',
    fontSize: '14px',
  };

  return (
    <ProtectedLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-outfit font-bold mb-1" style={{ color: '#005239' }}>
            Class Schedule
          </h1>
          <p style={{ color: '#006d4a' }}>Manage time slots and assign teachers &amp; subjects</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between p-4 rounded-xl mb-5" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
            <span>{error}</span>
            <button
              className="text-sm font-semibold underline ml-4"
              onClick={() => setError('')}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Class selector */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 flex flex-wrap items-center gap-4" style={{ border: '1px solid #d1fae5' }}>
          <label className="font-semibold text-sm" style={{ color: '#005239' }}>Select Class:</label>
          <select
            style={inputStyle}
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            onFocus={e => e.target.style.borderColor = '#006d4a'}
            onBlur={e => e.target.style.borderColor = '#a7f3d0'}
          >
            <option value="">-- Choose a class --</option>
            {classes.map((c) => (
              <option key={c.class_id} value={c.class_id}>
                {c.class_name} - {c.grade_name} ({c.section_name})
              </option>
            ))}
          </select>
        </div>

        {selectedClass && (
          <>
            {/* Day tabs */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {DAYS.map((d) => (
                <button
                  key={d.key}
                  className="px-5 py-2 rounded-xl font-semibold text-sm transition-all"
                  style={
                    selectedDay === d.key
                      ? { background: 'linear-gradient(135deg, #006d4a 0%, #005239 100%)', color: 'white', boxShadow: '0 4px 14px rgba(0,96,73,0.25)' }
                      : { background: 'white', color: '#006d4a', border: '1.5px solid #a7f3d0' }
                  }
                  onClick={() => setSelectedDay(d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Actions bar */}
            <div className="flex gap-3 mb-5">
              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #006d4a 0%, #005239 100%)' }}
                onClick={() => setShowSlotForm(!showSlotForm)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <line x1="8" y1="2" x2="8" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="2" y1="8" x2="14" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Add New Time Slot
              </button>
            </div>

            {/* Add time slot form */}
            {showSlotForm && (
              <form onSubmit={handleAddSlot} className="bg-white rounded-2xl shadow-sm p-5 mb-5 flex flex-wrap items-end gap-4" style={{ border: '1px solid #d1fae5' }}>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#005239' }}>Subject</label>
                  <select
                    style={inputStyle}
                    value={slotForm.subject_id}
                    onChange={(e) => setSlotForm({ ...slotForm, subject_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select subject --</option>
                    {subjects.map((s) => (
                      <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#005239' }}>Start Time</label>
                  <input
                    type="time"
                    style={inputStyle}
                    value={slotForm.start_time}
                    onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#005239' }}>End Time</label>
                  <input
                    type="time"
                    style={inputStyle}
                    value={slotForm.end_time}
                    onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #006d4a 0%, #005239 100%)' }}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  onClick={() => {
                    setShowSlotForm(false);
                    setSlotForm({ start_time: '08:00', end_time: '08:45', subject_id: '' });
                  }}
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Assignment form */}
            {showAssignForm && (
              <form onSubmit={handleAssign} className="bg-white rounded-2xl shadow-sm p-5 mb-5 flex flex-wrap items-end gap-4" style={{ border: '1px solid #d1fae5' }}>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#005239' }}>Subject</label>
                  <select
                    style={inputStyle}
                    value={assignForm.subject_id}
                    onChange={(e) => setAssignForm({ ...assignForm, subject_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select subject --</option>
                    {subjects.map((s) => (
                      <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#005239' }}>Teacher</label>
                  <select
                    style={inputStyle}
                    value={assignForm.teacher_id}
                    onChange={(e) => setAssignForm({ ...assignForm, teacher_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select teacher --</option>
                    {teachers.map((t) => (
                      <option key={t.teacher_id} value={t.teacher_id}>{t.teacher_name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #006d4a 0%, #005239 100%)' }}
                >
                  Assign
                </button>
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  onClick={() => setShowAssignForm(false)}
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Schedule table */}
            {loading ? (
              <div className="flex justify-center items-center py-16 gap-3">
                <svg className="h-7 w-7 animate-spin" style={{ color: '#006d4a' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span style={{ color: '#006d4a' }} className="font-medium">Loading schedule...</span>
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center" style={{ border: '1px solid #d1fae5' }}>
                <div className="flex justify-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: '#f0fdf4' }}>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <rect x="4" y="6" width="24" height="22" rx="3" stroke="#006d4a" strokeWidth="1.5" fill="none"/>
                      <line x1="4" y1="12" x2="28" y2="12" stroke="#006d4a" strokeWidth="1.5"/>
                      <line x1="10" y1="4" x2="10" y2="10" stroke="#006d4a" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="22" y1="4" x2="22" y2="10" stroke="#006d4a" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="11" y1="20" x2="21" y2="20" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                <p className="font-semibold" style={{ color: '#005239' }}>No time slots for {selectedDay}</p>
                <p className="text-sm text-gray-400 mt-1">Add a new time slot using the button above</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #d1fae5' }}>
                <table className="w-full text-left">
                  <thead style={{ background: 'linear-gradient(135deg, #006d4a 0%, #005239 100%)' }}>
                    <tr>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-emerald-100">#</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-emerald-100">From</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-emerald-100">To</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-emerald-100">Subject</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-emerald-100">Teacher</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-emerald-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.paginatedItems.map((slot, idx) => (
                      <tr key={slot.time_slot_id} className="border-b border-gray-100 hover:bg-emerald-50/40 transition-colors">
                        <td className="px-5 py-4 text-sm text-gray-400 font-medium">{pagination.startIndex + idx + 1}</td>
                        <td className="px-5 py-4 font-mono text-sm font-semibold" style={{ color: '#005239' }}>{slot.start_time?.slice(0, 5)}</td>
                        <td className="px-5 py-4 font-mono text-sm font-semibold" style={{ color: '#005239' }}>{slot.end_time?.slice(0, 5)}</td>
                        <td className="px-5 py-4 text-sm text-gray-700">
                          {slot.subject_name || <span className="text-gray-400 italic">Not assigned</span>}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700">
                          {slot.teacher_name || <span className="text-gray-400 italic">Not assigned</span>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2 flex-wrap items-center">
                            {/* Edit / Assign button */}
                            <button
                              onClick={() => openAssignForm(slot)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:shadow-md"
                              style={{ background: 'linear-gradient(135deg, #006d4a 0%, #005239 100%)', color: 'white' }}
                            >
                              {slot.teacher_id ? (
                                <>
                                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                    <path d="M7.5 1.5l2 2-6 6H1.5v-2l6-6z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                  </svg>
                                  Edit
                                </>
                              ) : (
                                <>
                                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                    <circle cx="5.5" cy="4" r="2.2" stroke="white" strokeWidth="1.2" fill="none"/>
                                    <path d="M1.5 10c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                                  </svg>
                                  Assign
                                </>
                              )}
                            </button>

                            {/* Remove assignment button */}
                            {slot.teacher_id && (
                              <button
                                onClick={() => openDeleteAssignModal(slot.time_slot_id)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:shadow-md"
                                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white' }}
                              >
                                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                  <path d="M2 5.5h7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                                  <path d="M8 3.5l2 2-2 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Remove
                              </button>
                            )}

                            {/* Delete slot button */}
                            <button
                              onClick={() => openDeleteSlotModal(slot.time_slot_id)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:shadow-md"
                              style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', color: 'white' }}
                            >
                              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                <path d="M1.5 3h8M4 3V2h3v1M4.5 5v3.5M6.5 5v3.5M2.5 3l.5 6h5l.5-6" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination */}
                {filteredSlots.length > 0 && (
                  <PaginationControls
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    itemsPerPage={pagination.itemsPerPage}
                    onPrevPage={pagination.prevPage}
                    onNextPage={pagination.nextPage}
                    onGoToPage={pagination.goToPage}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteSlotModal}
        title="Delete Time Slot"
        message="Are you sure you want to delete this time slot?"
        onConfirm={handleDeleteSlot}
        onCancel={() => {
          setShowDeleteSlotModal(false);
          setDeleteSlotId(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
      />

      <ConfirmModal
        isOpen={showDeleteAssignModal}
        title="Remove Assignment"
        message="Are you sure you want to remove this assignment?"
        onConfirm={handleRemoveAssignment}
        onCancel={() => {
          setShowDeleteAssignModal(false);
          setDeleteAssignId(null);
        }}
        confirmText="Remove"
        cancelText="Cancel"
        isDangerous
      />
    </ProtectedLayout>
  );
}
