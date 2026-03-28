import { useState, useEffect } from 'react';
import ProtectedLayout from '../components/ProtectedLayout';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const DAYS = [
  { key: 'Sunday', label: 'الأحد' },
  { key: 'Monday', label: 'الاثنين' },
  { key: 'Tuesday', label: 'الثلاثاء' },
  { key: 'Wednesday', label: 'الأربعاء' },
  { key: 'Thursday', label: 'الخميس' },
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
  const [slotForm, setSlotForm] = useState({ start_time: '08:00', end_time: '08:45' });

  // Assignment form
  const [assignForm, setAssignForm] = useState({ time_slot_id: '', subject_id: '', teacher_id: '' });
  const [showAssignForm, setShowAssignForm] = useState(false);

  // Load lookups
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [classesRes, teachersRes, subjectsRes] = await Promise.all([
          api.get('/schedule/classes'),
          api.get('/schedule/teachers'),
          api.get('/schedule/subjects'),
        ]);
        setClasses(classesRes.data);
        setTeachers(teachersRes.data);
        setSubjects(subjectsRes.data);
      } catch (err) {
        setError('فشل في تحميل البيانات');
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
      const res = await api.get(`/schedule/time-slots/${selectedClass}`);
      setSlots(res.data);
    } catch (err) {
      setError('فشل في تحميل الحصص');
    } finally {
      setLoading(false);
    }
  };

  const filteredSlots = slots.filter((s) => s.day_of_week === selectedDay);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    try {
      await api.post('/schedule/time-slots', {
        class_id: parseInt(selectedClass),
        day_of_week: selectedDay,
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
      });
      setShowSlotForm(false);
      setSlotForm({ start_time: '08:00', end_time: '08:45' });
      loadSlots();
    } catch (err) {
      setError('فشل في إضافة الحصة');
    }
  };

  const handleDeleteSlot = async () => {
    if (!deleteSlotId) return;
    try {
      await api.delete(`/schedule/time-slots/${deleteSlotId}`);
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
      await api.post('/schedule/assign', {
        class_id: parseInt(selectedClass),
        time_slot_id: parseInt(assignForm.time_slot_id),
        subject_id: parseInt(assignForm.subject_id),
        teacher_id: parseInt(assignForm.teacher_id),
      });
      setShowAssignForm(false);
      setAssignForm({ time_slot_id: '', subject_id: '', teacher_id: '' });
      loadSlots();
    } catch (err) {
      setError('فشل في تعيين المادة والمدرس');
    }
  };

  const handleRemoveAssignment = async () => {
    if (!deleteAssignId) return;
    try {
      await api.delete(`/schedule/assign/${deleteAssignId}`);
      loadSlots();
      setShowDeleteAssignModal(false);
      setDeleteAssignId(null);
    } catch (err) {
      setError('Failed to remove assignment');
      setShowDeleteAssignModal(false);
      setDeleteAssignId(null);
    }
  };

  const openDeleteAssignModal = (scheduleId) => {
    setDeleteAssignId(scheduleId);
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

  return (
    <ProtectedLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-brand-600">الجدول الدراسي</h1>
          <p className="text-gray-500 mt-1">إدارة الحصص وتعيين المدرسين والمواد</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4">
            {error}
            <button className="mr-2 underline" onClick={() => setError('')}>إغلاق</button>
          </div>
        )}

        {/* Class selector */}
        <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap items-center gap-4">
          <label className="font-semibold text-gray-700">اختر الفصل:</label>
          <select
            className="border rounded-lg px-4 py-2 min-w-[220px]"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">-- اختر فصل --</option>
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
            <div className="flex gap-2 mb-4 flex-wrap">
              {DAYS.map((d) => (
                <button
                  key={d.key}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedDay === d.key
                      ? 'bg-brand-600 text-white shadow'
                      : 'bg-white text-gray-600 hover:bg-brand-50 border'
                  }`}
                  onClick={() => setSelectedDay(d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Actions bar */}
            <div className="flex gap-2 mb-4">
              <button
                className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700"
                onClick={() => setShowSlotForm(!showSlotForm)}
              >
                ➕ إضافة حصة جديدة
              </button>
            </div>

            {/* Add time slot form */}
            {showSlotForm && (
              <form onSubmit={handleAddSlot} className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">وقت البداية</label>
                  <input
                    type="time"
                    className="border rounded px-3 py-2"
                    value={slotForm.start_time}
                    onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">وقت النهاية</label>
                  <input
                    type="time"
                    className="border rounded px-3 py-2"
                    value={slotForm.end_time}
                    onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                  حفظ
                </button>
                <button
                  type="button"
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                  onClick={() => setShowSlotForm(false)}
                >
                  إلغاء
                </button>
              </form>
            )}

            {/* Assignment form */}
            {showAssignForm && (
              <form onSubmit={handleAssign} className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">المادة</label>
                  <select
                    className="border rounded px-3 py-2 min-w-[180px]"
                    value={assignForm.subject_id}
                    onChange={(e) => setAssignForm({ ...assignForm, subject_id: e.target.value })}
                    required
                  >
                    <option value="">-- اختر مادة --</option>
                    {subjects.map((s) => (
                      <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">المدرس</label>
                  <select
                    className="border rounded px-3 py-2 min-w-[180px]"
                    value={assignForm.teacher_id}
                    onChange={(e) => setAssignForm({ ...assignForm, teacher_id: e.target.value })}
                    required
                  >
                    <option value="">-- اختر مدرس --</option>
                    {teachers.map((t) => (
                      <option key={t.teacher_id} value={t.teacher_id}>{t.teacher_name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                  تعيين
                </button>
                <button
                  type="button"
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                  onClick={() => setShowAssignForm(false)}
                >
                  إلغاء
                </button>
              </form>
            )}

            {/* Schedule table */}
            {loading ? (
              <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
            ) : filteredSlots.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
                لا توجد حصص ليوم {DAYS.find((d) => d.key === selectedDay)?.label}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-right">
                  <thead className="bg-brand-600 text-white">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">من</th>
                      <th className="px-4 py-3">إلى</th>
                      <th className="px-4 py-3">المادة</th>
                      <th className="px-4 py-3">المدرس</th>
                      <th className="px-4 py-3">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSlots.map((slot, idx) => (
                      <tr key={slot.time_slot_id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono">{slot.start_time?.slice(0, 5)}</td>
                        <td className="px-4 py-3 font-mono">{slot.end_time?.slice(0, 5)}</td>
                        <td className="px-4 py-3">
                          {slot.subject_name || <span className="text-gray-400 italic">غير محدد</span>}
                        </td>
                        <td className="px-4 py-3">
                          {slot.teacher_name || <span className="text-gray-400 italic">غير محدد</span>}
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          <button
                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 text-sm"
                            onClick={() => openAssignForm(slot)}
                          >
                            {slot.schedule_id ? 'تعديل' : 'تعيين'}
                          </button>
                          {slot.schedule_id && (
                            <button
                              className="bg-orange-100 text-orange-700 px-3 py-1 rounded hover:bg-orange-200 text-sm"
                              onClick={() => openDeleteAssignModal(slot.schedule_id)}
                            >
                              إزالة التعيين
                            </button>
                          )}
                          <button
                            className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 text-sm"
                            onClick={() => openDeleteSlotModal(slot.time_slot_id)}
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
