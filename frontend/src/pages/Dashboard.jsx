import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigationItems = [
    { label: 'Schools', href: '/schools' },
    { label: 'Grades', href: '/grades' },
    { label: 'Sections', href: '/sections' },
    { label: 'Classes', href: '/classes' },
    { label: 'Teachers', href: '/teachers' },
    { label: 'Subjects', href: '/subjects' },
  ];

  const stats = [
    { title: 'Schools', link: '/schools', color: 'bg-brand-50 text-brand-600' },
    { title: 'Teachers', link: '/teachers', color: 'bg-brand-50 text-brand-600' },
    { title: 'Classes', link: '/classes', color: 'bg-brand-50 text-brand-600' },
    { title: 'Subjects', link: '/subjects', color: 'bg-brand-50 text-brand-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Header */}
      <header className="fixed top-0 right-0 left-0 bg-white shadow-lg z-30">
        <div className="px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-2xl md:text-3xl font-outfit font-bold text-gray-800 hover:opacity-90">
            Firasah AI
          </Link>
          
          <nav className="hidden md:flex gap-8"></nav>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-gray-600 transition-colors"
            >
              {user?.name || 'User'} ▼
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 z-50">
                <Link to="/profile" className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-brand-50 dark:hover:bg-gray-700">
                  Profile
                </Link>
                <Link to="/settings" className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-brand-50 dark:hover:bg-gray-700">
                  Settings
                </Link>
                <hr className="my-2" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-error-50 dark:hover:bg-error-900 text-error-600"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-6 pl-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-12 mx-6">
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
      </main>
    </div>
  );
};

export default Dashboard;
