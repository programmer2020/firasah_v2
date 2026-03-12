import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import ProtectedLayout from '../components/ProtectedLayout';

export const Teachers = () => {
  const location = useLocation();
  const initialFormData = {
    school_id: 1,
    teacher_name: '',
    teacher_email: '',
    teacher_phone: '',
  };

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (!location.state?.openForm) {
      return;
    }

    setEditingId(null);
    setFormData({
      school_id: 1,
      teacher_name: '',
      teacher_email: '',
      teacher_phone: '',
    });
    setError('');
    setShowForm(true);
  }, [location.state]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/teachers');
      setTeachers(response.data.data || []);
    } catch (err) {
      setError('Failed to fetch teachers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/teachers/${editingId}`, formData);
      } else {
        await api.post('/teachers', formData);
      }

      setError('');
      setEditingId(null);
      setFormData(initialFormData);
      setShowForm(false);
      await fetchTeachers();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to save teacher';
      setError(message);
      console.error(err);
    }
  };

  const handleEdit = (teacher) => {
    setEditingId(teacher.teacher_id);
    setFormData({
      school_id: teacher.school_id || 1,
      teacher_name: teacher.teacher_name || '',
      teacher_email: teacher.teacher_email || '',
      teacher_phone: teacher.teacher_phone || '',
    });
    setError('');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher?'))
      return;
    try {
      await api.delete(`/teachers/${id}`);
      fetchTeachers();
    } catch (err) {
      setError('Failed to delete teacher');
      console.error(err);
    }
  };

  return (
    <ProtectedLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-outfit font-bold text-gray-900 dark:text-white">
            Teachers Management
          </h1>
          <button
            onClick={() => {
              if (showForm) {
                setEditingId(null);
                setFormData(initialFormData);
                setError('');
              }
              setShowForm(!showForm);
            }}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-md"
          >
            {showForm ? 'Cancel' : '+ Add Teacher'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg text-error-700">
            {error}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Teacher Name
                </label>
                <input
                  type="text"
                  name="teacher_name"
                  value={formData.teacher_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter teacher name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="teacher_email"
                  value={formData.teacher_email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="teacher_phone"
                  value={formData.teacher_phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-6 w-full px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-md"
            >
              {editingId ? 'Update Teacher' : 'Add Teacher'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading teachers...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-brand-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Teacher Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {teachers.length > 0 ? (
                  teachers.map((teacher) => (
                    <tr
                      key={teacher.teacher_id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {teacher.teacher_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {teacher.teacher_email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {teacher.teacher_phone}
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <button
                          onClick={() => handleEdit(teacher)}
                          className="px-3 py-1 bg-brand-100 text-brand-600 rounded hover:bg-brand-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.teacher_id)}
                          className="px-3 py-1 bg-error-100 text-error-600 rounded hover:bg-error-200 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                      No teachers found. Add one to get started!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
};

export default Teachers;
