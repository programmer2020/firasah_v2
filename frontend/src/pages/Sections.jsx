import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ProtectedLayout from '../components/ProtectedLayout';

export const Sections = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    section_name: '',
  });

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sections');
      setSections(response.data.data || []);
    } catch (err) {
      setError('Failed to fetch sections');
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
      await api.post('/sections', formData);
      setFormData({ section_name: '' });
      setShowForm(false);
      fetchSections();
    } catch (err) {
      setError('Failed to add section');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this section?')) return;
    try {
      await api.delete(`/sections/${id}`);
      fetchSections();
    } catch (err) {
      setError('Failed to delete section');
      console.error(err);
    }
  };

  return (
    <ProtectedLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-outfit font-bold text-gray-900 dark:text-white">
            Sections Management
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-md"
          >
            {showForm ? 'Cancel' : '+ Add Section'}
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
                  Section Name
                </label>
                <input
                  type="text"
                  name="section_name"
                  value={formData.section_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter section name"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-6 w-full px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-md"
            >
              Add Section
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading sections...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-brand-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Section Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sections.length > 0 ? (
                  sections.map((section) => (
                    <tr
                      key={section.section_id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {section.section_name}
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <button className="px-3 py-1 bg-brand-100 text-brand-600 rounded hover:bg-brand-200 transition-colors">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(section.section_id)}
                          className="px-3 py-1 bg-error-100 text-error-600 rounded hover:bg-error-200 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                      No sections found. Add one to get started!
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

export default Sections;
