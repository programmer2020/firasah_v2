import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedLayout from '../components/ProtectedLayout';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const stats = [
    { title: 'Schools', link: '/schools', color: 'bg-brand-50 text-brand-600' },
    { title: 'Teachers', link: '/teachers', color: 'bg-brand-50 text-brand-600' },
    { title: 'Classes', link: '/classes', color: 'bg-brand-50 text-brand-600' },
    { title: 'Subjects', link: '/subjects', color: 'bg-brand-50 text-brand-600' },
  ];

  return (
    <ProtectedLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-outfit font-bold text-gray-900 dark:text-white mb-2">
            Welcome, {user?.name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Firasah AI - School Management Dashboard
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {stats.map((stat) => (
              <Link
                key={stat.title}
                to={stat.link}
                className={`${stat.color} p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
              >
                <h3 className="text-lg font-semibold mb-4">{stat.title}</h3>
                <p className="text-3xl font-bold">-</p>
                <p className="text-sm mt-2 opacity-75">Manage {stat.title.toLowerCase()}</p>
              </Link>
            ))}
          </div>

          {/* Quick Actions */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-md hover:shadow-lg">
                Add New School
              </button>
              <button className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-md hover:shadow-lg">
                Add Teacher
              </button>
              <button className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-md hover:shadow-lg">
                Create Class
              </button>
              <button className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-md hover:shadow-lg">
                Add Subject
              </button>
            </div>
          </section>
      </div>
    </ProtectedLayout>
  );
};

export default Dashboard;
