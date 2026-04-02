import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const IconDashboard = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z" />
  </svg>
);

const IconSchool = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 3 2 9v2h20V9L12 3Zm0 4.18V7.82L6.9 10.5h10.2L12 7.18ZM4 13h2v5H4v-5Zm4 0h2v5H8v-5Zm4 0h2v5h-2v-5Zm4 0h2v5h-2v-5ZM2 20h20v2H2v-2Z" />
  </svg>
);

const IconClips = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm4 3v6l5-3-5-3Zm8-4h2v2h-2V5Zm0 12h2v2h-2v-2Z" />
  </svg>
);

const IconTexture = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />
  </svg>
);

const IconHighlights = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="m12 2 1.9 5.8H20l-4.95 3.6 1.9 5.8L12 13.6l-4.95 3.6 1.9-5.8L4 7.8h6.1L12 2Z" />
  </svg>
);

const IconUpload = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 15v4H5v-4H3v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4h-2ZM11 16h2V8h3l-4-4-4 4h3v8Z" />
  </svg>
);

const IconAnalytics = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
  </svg>
);

const IconGlobe = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: IconDashboard },
    { label: 'Teacher Analytics', href: '/teacher-dashboard', icon: IconAnalytics },
    { label: 'Lectures', href: '/audio-upload', icon: IconSchool },
    { label: 'Failed Fragments', href: '/failed-fragments', icon: IconClips },
    { label: 'Class Schedule', href: '/schedule', icon: IconTexture },
    { label: 'Highlights', href: '/evaluations', icon: IconHighlights },
    { label: 'Admin Upload', href: '/worker-jobs', icon: IconUpload },
  ];

  const activeIndex = Math.max(
    0,
    menuItems.findIndex((item) => location.pathname === item.href),
  );

  const handleMouseEnter = () => {
    setIsCollapsed(false);
  };

  const handleMouseLeave = () => {
    setIsCollapsed(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-[#0a1814]/45 backdrop-blur-sm transition lg:hidden ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-label="Close sidebar overlay"
      />

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`emerald-sidebar fixed left-0 top-0 z-50 flex h-screen flex-col py-8 text-white transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className={`mb-12 flex items-start justify-between px-8 transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
          <div>
            <h1 className="font-headline text-2xl font-bold tracking-[-0.08em] text-white">FIRASAH</h1>
            <p className="font-dashboard-mono text-[10px] uppercase tracking-[0.2em] text-white/60">Precision Intelligence</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center text-white/80 transition hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className={`relative flex-1 space-y-1 px-4 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <div
            className="absolute left-0 h-10 w-1 bg-[#F8F9FA] transition-transform duration-200"
            style={{ transform: `translateY(${activeIndex * 52}px)` }}
          />

          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const active = location.pathname === item.href;

            return (
              <Link
                key={item.label}
                to={item.href}
                onClick={onClose}
                className={`relative z-10 flex items-center px-4 py-3 transition-all duration-200 ${
                  isCollapsed ? 'justify-center' : ''
                } ${
                  active ? 'font-bold text-white' : 'text-white/70 hover:bg-[#0F7B5F]/50 hover:text-white'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <IconComponent className={`text-xl transition-all duration-300 ${isCollapsed ? 'h-10 w-10' : 'h-5 w-5'} ${isCollapsed ? '' : 'mr-3'}`} />
                <span className={`text-sm tracking-tight transition-opacity duration-300 ${isCollapsed ? 'hidden' : 'block'}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={`mt-auto px-8 pt-8 transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex items-center gap-3 bg-white/5 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#d8ede4]">
              <span className="font-headline text-xs font-bold text-[#006049]">
                {getInitials(user?.name)}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-xs font-bold text-white">{user?.name || 'User'}</p>
              <p className="font-dashboard-mono text-[10px] text-white/50">{user?.role || ''}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
