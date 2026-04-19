import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const IconHome = ({ className = 'h-6 w-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path
      d="M5 10.25 12 4l7 6.25V19a1 1 0 0 1-1 1h-3.75v-5.25h-4.5V20H6a1 1 0 0 1-1-1v-8.75Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
    />
  </svg>
);

const IconLectures = ({ className = 'h-6 w-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path
      d="M4.75 6.5h5.75a2.5 2.5 0 0 1 2.5 2.5V18.5H7.25a2.5 2.5 0 0 0-2.5 2.5V6.5Zm14.5 0H13.5v12h5.75A2.5 2.5 0 0 1 21.75 21V9a2.5 2.5 0 0 0-2.5-2.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
    />
    <path
      d="M8 10h2.5M8 13h2.5M16 10h-2.5M16 13h-2.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.55"
    />
  </svg>
);

const IconClips = ({ className = 'h-6 w-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path d="M8 5.14v14l11-7-11-7Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
  </svg>
);

const IconPatterns = ({ className = 'h-6 w-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path d="M3 17c2-4 5-8 9-8s7 4 9 8M3 12c2-3 5-6 9-6s7 3 9 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
  </svg>
);

const IconHighlights = ({ className = 'h-6 w-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path d="m12 3-1.9 5.8H4.2l4.9 3.5L7.2 18 12 14.4l4.8 3.5-1.9-5.7 4.9-3.5h-5.9L12 3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
  </svg>
);

const IconUpload = ({ className = 'h-6 w-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path d="M12 16V4m0 0-4 4m4-4 4 4M4 18h16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
  </svg>
);

const IconNewAnalysis = ({ className = 'h-6 w-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const IconSettings = ({ className = 'h-6 w-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
  </svg>
);

const IconSupport = ({ className = 'h-6 w-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
  </svg>
);

const ChevronLeftIcon = ({ className = 'h-4 w-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path d="m14.5 6-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const ChevronRightIcon = ({ className = 'h-4 w-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path d="m9.5 6 6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const BrandMark = () => (
  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0e7755] shadow-[0_12px_28px_-16px_rgba(14,119,85,0.7)]">
    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
      <path
        d="M6.5 16.5 10.8 7.8a1 1 0 0 1 1.82.08l1.28 3.15a1 1 0 0 0 .93.63h2.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="M6.5 16.5h11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
    </svg>
  </div>
);

const SidebarBrand = ({ isCollapsed }) => (
  <div className={`hidden lg:flex fixed left-0 top-0 z-50 h-[116px] items-start justify-between bg-[#f3f4f5] px-4 py-8 text-[#191c1d] transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? 'w-20' : 'w-64'}`}>
    <div className="flex items-center gap-3 overflow-hidden px-2">
      <BrandMark />

      <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'}`}>
        <p className="font-body text-[2rem] font-black leading-none tracking-[-0.06em] text-[#111827]">
          Firasah
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5f5e5e]">
          Educational Insights
        </p>
      </div>
    </div>
  </div>
);

export const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const location = useLocation();

  const mainItems = [
    { label: 'Home', href: '/dashboard', icon: IconHome },
    { label: 'Lectures', href: '/audio-upload', icon: IconLectures },
    { label: 'Clips', href: '/clips', icon: IconClips },
    { label: 'Patterns', href: '/patterns', icon: IconPatterns },
    { label: 'Highlights', href: '/highlights', icon: IconHighlights },
    { label: 'Admin Upload', href: '/admin-upload', icon: IconUpload },
  ];

  const bottomItems = [
    { label: 'Settings', href: '/settings', icon: IconSettings },
    { label: 'Support', href: '/support', icon: IconSupport },
  ];

  const showExpandedContent = isOpen || !isCollapsed;

  const handleToggleCollapse = () => {
    onToggleCollapse?.();
  };

  return (
    <>
      <SidebarBrand isCollapsed={isCollapsed} />

      <button
        type="button"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[rgba(25,28,29,0.2)] backdrop-blur-[2px] transition lg:hidden ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-label="Close sidebar overlay"
      />

      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex flex-col bg-[#f3f4f5] px-4 py-8 text-[#191c1d] shadow-[0_18px_40px_-28px_rgba(25,28,29,0.45)] transition-[width,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          showExpandedContent ? 'w-[272px] lg:w-64' : 'w-[272px] lg:w-20'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:top-[116px] lg:translate-x-0 lg:shadow-none`}
      >
        <button
          type="button"
          onClick={handleToggleCollapse}
          className="absolute -right-3 top-6 hidden h-7 w-7 items-center justify-center rounded-full bg-white text-[#727a64] shadow-[0_4px_20px_rgba(25,28,29,0.08)] ring-1 ring-[rgba(193,202,176,0.48)] transition hover:text-[#0e7755] lg:flex"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>

        <div className="flex min-h-0 flex-1 flex-col gap-8 font-body">
          <div className="flex items-start justify-between gap-3 px-2 lg:hidden">
            <div className="flex items-center gap-3 overflow-hidden">
              <BrandMark />

              <div className="overflow-hidden whitespace-nowrap">
                <p className="font-body text-[2rem] font-black leading-none tracking-[-0.06em] text-[#111827]">
                  Firasah
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5f5e5e]">
                  Educational Insights
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#5f5e5e] shadow-[0_10px_24px_-18px_rgba(25,28,29,0.32)] transition hover:text-[#0e7755] lg:hidden"
              aria-label="Close sidebar"
            >
              <CloseIcon />
            </button>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {mainItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  title={item.label}
                  className={`flex items-center rounded-xl px-3 py-3 transition-all duration-200 ${
                    showExpandedContent ? 'gap-3' : 'justify-center'
                  } ${
                    isActive
                      ? 'bg-[#0e7755] text-white shadow-[0_18px_32px_-22px_rgba(14,119,85,0.9)]'
                      : 'text-[#64748b] hover:bg-[#e7e8e9] hover:text-[#191c1d]'
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                    <IconComponent className="h-6 w-6" />
                  </span>

                  <span
                    className={`overflow-hidden whitespace-nowrap text-[0.95rem] font-medium transition-all duration-300 ${
                      showExpandedContent ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* New Analysis Button */}
            <Link
              to="/new-analysis"
              onClick={onClose}
              title="New Analysis"
              className={`mt-3 flex items-center rounded-xl border-2 border-dashed border-[#0e7755]/30 px-3 py-3 text-[#0e7755] transition-all duration-200 hover:border-[#0e7755] hover:bg-[#0e7755]/5 ${
                showExpandedContent ? 'gap-3' : 'justify-center'
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                <IconNewAnalysis className="h-6 w-6" />
              </span>
              <span
                className={`overflow-hidden whitespace-nowrap text-[0.95rem] font-semibold transition-all duration-300 ${
                  showExpandedContent ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0'
                }`}
              >
                New Analysis
              </span>
            </Link>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bottom Items */}
            {bottomItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  title={item.label}
                  className={`flex items-center rounded-xl px-3 py-3 transition-all duration-200 ${
                    showExpandedContent ? 'gap-3' : 'justify-center'
                  } ${
                    isActive
                      ? 'bg-[#0e7755] text-white shadow-[0_18px_32px_-22px_rgba(14,119,85,0.9)]'
                      : 'text-[#64748b] hover:bg-[#e7e8e9] hover:text-[#191c1d]'
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                    <IconComponent className="h-6 w-6" />
                  </span>

                  <span
                    className={`overflow-hidden whitespace-nowrap text-[0.95rem] font-medium transition-all duration-300 ${
                      showExpandedContent ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;
