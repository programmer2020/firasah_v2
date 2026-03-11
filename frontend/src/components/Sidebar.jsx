import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Material Design Icon Components
const IconSchool = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 3L2 9v2h20V9L12 3zm0 4.18V7.82L6.9 10.5h10.2L12 7.18zM2 20h20v2H2z" />
  </svg>
);

const IconPeople = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 7c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4zm6 5H3v-2c0-1.5 3.58-2.5 6-2.5s6 1 6 2.5v2z" />
  </svg>
);

const IconBooks = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 16H5V4h14v14zm-5.04-6.71l-2.75 3.54-2.16-2.66c-.23-.29-.61-.37-.92-.15-.31.21-.38.56-.15.87l2.92 3.58c.23.29.61.37.92.15l3.54-4.58c.23-.29.14-.65-.15-.92-.29-.23-.65-.14-.92.15z" />
  </svg>
);

const IconEdit = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
    <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

const IconChart = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-3-5h2V7h-2v7zm-4 0h2V9h-2v5zm-4 0h2v-3H8v3z" />
  </svg>
);

const IconList = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M15 5H5v2h10V5zm0 8H5v2h10v-2zM5 16h10v-2H5v2zM20 5h-2v6h2V5zm0 8h-2v2h2v-2z" />
  </svg>
);

const IconMic = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
    <path d="M17 16c0 2.76-2.24 5-5 5s-5-2.24-5-5h-2c0 3.87 3.13 7 7 7s7-3.13 7-7h-2z" />
  </svg>
);

const IconCalendar = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
  </svg>
);

const IconHome = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const IconSettings = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.61-.22l-2.39.96a7.03 7.03 0 00-1.63-.94l-.36-2.54a.5.5 0 00-.5-.42h-3.84a.5.5 0 00-.5.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 00-.61.22L2.71 8.84a.5.5 0 00.12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32c.13.22.39.31.61.22l2.39-.96c.51.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.22.09.48 0 .61-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1112 8a3.5 3.5 0 010 7.5z" />
  </svg>
);

export const Sidebar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: IconHome,
    },
    {
      label: 'Schools',
      href: '/schools',
      icon: IconSchool,
    },
    {
      label: 'Teachers',
      href: '/teachers',
      icon: IconPeople,
    },
    {
      label: 'Classes',
      href: '/classes',
      icon: IconBooks,
    },
    {
      label: 'Subjects',
      href: '/subjects',
      icon: IconEdit,
    },
    {
      label: 'Grades',
      href: '/grades',
      icon: IconChart,
    },
    {
      label: 'Sections',
      href: '/sections',
      icon: IconList,
    },
    {
      label: 'Audio Upload',
      href: '/audio-upload',
      icon: IconMic,
    },
    {
      label: 'الجدول الدراسي',
      href: '/schedule',
      icon: IconCalendar,
    },
    {
      label: 'جدولة الـ Worker',
      href: '/worker-jobs',
      icon: IconSettings,
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
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive(item.href)
                  ? 'bg-gray-300 text-gray-900 shadow-md dark:bg-gray-600 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <IconComponent />
              {isOpen && <span className="font-medium text-sm">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
};

export default Sidebar;
