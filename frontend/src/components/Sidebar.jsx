import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Sidebar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    {
      label: 'Schools',
      href: '/schools',
      icon: '🏫',
    },
    {
      label: 'Teachers',
      href: '/teachers',
      icon: '👨‍🏫',
    },
    {
      label: 'Classes',
      href: '/classes',
      icon: '📚',
    },
    {
      label: 'Subjects',
      href: '/subjects',
      icon: '✏️',
    },
    {
      label: 'Grades',
      href: '/grades',
      icon: '📊',
    },
    {
      label: 'Sections',
      href: '/sections',
      icon: '📋',
    },
    {
      label: 'Audio Upload',
      href: '/audio-upload',
      icon: '🎙️',
    },
    {
      label: 'الجدول الدراسي',
      href: '/schedule',
      icon: '📅',
    },
  ];

  const isActive = (href) => location.pathname === href;

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-20'
      } pt-24 z-40`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-24 -right-3 bg-brand-600 text-white rounded-full p-1.5 shadow-md hover:bg-brand-700 transition-colors"
      >
        <svg
          className={`w-5 h-5 transition-transform ${!isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Menu Items */}
      <nav className="px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              isActive(item.href)
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-brand-900/20'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {isOpen && <span className="font-medium text-sm">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Footer Info */}
      {isOpen && (
        <div className="absolute bottom-6 left-4 right-4 p-4 bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-900/10 rounded-lg border border-brand-200 dark:border-brand-700">
          <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">Firasah AI</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">School Management</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
