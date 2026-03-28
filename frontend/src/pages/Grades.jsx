import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ProtectedLayout from '../components/ProtectedLayout';
import ConfirmModal from '../components/ConfirmModal';

export const Grades = () => {
  const initialFormData = {
    school_id: 1,
    grade_name: '',
    grade_level: '',
  };

  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const response = await api.get('/grades');
      setGrades(response.data.data || []);
    } catch (err) {
      setError('Failed to fetch grades');
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

    // Validate all fields are filled
    if (!formData.grade_name.trim()) {
      setError('Grade name is required');
      return;
    }

    if (!formData.grade_level || isNaN(formData.grade_level)) {
      setError('Grade level must be a valid number');
      return;
    }

    // Check if grade name already exists when creating new grade
    if (!editingId) {
      const nameExists = grades.some(
        (g) => g.grade_name.toLowerCase() === formData.grade_name.toLowerCase()
      );
      if (nameExists) {
        setError(`Grade "${formData.grade_name}" already exists. Choose a different name.`);
        return;
      }
    }

    try {
      const dataToSend = {
        school_id: formData.school_id,
        grade_name: formData.grade_name,
        grade_level: parseInt(formData.grade_level, 10),
      };

      if (editingId) {
        await api.put(`/grades/${editingId}`, dataToSend);
      } else {
        await api.post('/grades', dataToSend);
      }

      setError('');
      setEditingId(null);
      setFormData(initialFormData);
      setShowForm(false);
      await fetchGrades();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to save grade';
      setError(message);
      console.error(err);
    }
  };

  const handleEdit = (grade) => {
    setEditingId(grade.grade_id);
    setFormData({
      school_id: grade.school_id || 1,
      grade_name: grade.grade_name || '',
      grade_level: grade.grade_level || '',
    });
    setError('');
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/grades/${deleteId}`);
      fetchGrades();
      setShowConfirmModal(false);
      setDeleteId(null);
    } catch (err) {
      setError('Failed to delete grade');
      console.error(err);
      setShowConfirmModal(false);
      setDeleteId(null);
    }
  };

  return (
    <ProtectedLayout>
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Delete Grade"
        message="Are you sure you want to delete this grade?"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setDeleteId(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
      />
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-outfit font-bold text-gray-900 dark:text-white">
            Grades Management
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
            {showForm ? 'Cancel' : '+ Add Grade'}
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
                  Grade Name
                </label>
                <input
                  type="text"
                  name="grade_name"
                  value={formData.grade_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter grade name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Grade Level
                </label>
                <input
                  type="number"
                  name="grade_level"
                  value={formData.grade_level}
                  onChange={handleChange}
                  required
                  min="1"
                  step="1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter grade level"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-6 w-full px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-md"
            >
              {editingId ? 'Update Grade' : 'Add Grade'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading grades...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-brand-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Grade Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Grade Level
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {grades.length > 0 ? (
                  grades.map((grade) => (
                    <tr
                      key={grade.grade_id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {grade.grade_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {grade.grade_level}
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <button
                          onClick={() => handleEdit(grade)}
                          className="px-3 py-1 bg-brand-100 text-brand-600 rounded hover:bg-brand-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(grade.grade_id)}
                          className="px-3 py-1 bg-error-100 text-error-600 rounded hover:bg-error-200 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                      No grades found. Add one to get started!
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

export default Grades;
