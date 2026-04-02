import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MenuIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </svg>
);

const BellIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M14.86 17H9.14m9.3 0H19a1 1 0 0 0 .8-1.6l-1.3-1.73a2 2 0 0 1-.4-1.2V10a6.1 6.1 0 0 0-4.5-5.89V3.5a1.6 1.6 0 0 0-3.2 0v.61A6.1 6.1 0 0 0 5.9 10v2.47a2 2 0 0 1-.4 1.2L4.2 15.4A1 1 0 0 0 5 17h.56m9.3 0a2.86 2.86 0 0 1-5.72 0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    <path d="m19.4 15 .33 1.92a.9.9 0 0 1-.23.8l-1.28 1.28a.9.9 0 0 1-.8.23L15.5 18.9a7.04 7.04 0 0 1-1.45.84l-.96 1.7a.9.9 0 0 1-.78.46h-1.82a.9.9 0 0 1-.78-.46l-.96-1.7A7.04 7.04 0 0 1 7.3 18.9l-1.92.33a.9.9 0 0 1-.8-.23L3.3 17.72a.9.9 0 0 1-.23-.8L3.4 15a7.56 7.56 0 0 1 0-1.98L3.07 11.1a.9.9 0 0 1 .23-.8l1.28-1.28a.9.9 0 0 1 .8-.23L7.3 9.1c.44-.34.93-.62 1.45-.84l.96-1.7a.9.9 0 0 1 .78-.46h1.82a.9.9 0 0 1 .78.46l.96 1.7c.52.22 1.01.5 1.45.84l1.92-.33a.9.9 0 0 1 .8.23l1.28 1.28a.9.9 0 0 1 .23.8L19.4 13c.08.66.08 1.32 0 2Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-[14px] w-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const routeMeta = {
  '/dashboard': { section: 'Dashboard', title: 'Overview' },
  '/schools': { section: 'Dashboard', title: 'Schools' },
  '/teachers': { section: 'Dashboard', title: 'Teachers' },
  '/classes': { section: 'Dashboard', title: 'Classes' },
  '/subjects': { section: 'Dashboard', title: 'Subjects' },
  '/grades': { section: 'Dashboard', title: 'Grades' },
  '/sections': { section: 'Dashboard', title: 'Sections' },
  '/audio-upload': { section: 'Dashboard', title: 'Lectures' },
  '/failed-fragments': { section: 'Dashboard', title: 'Failed Fragments' },
  '/schedule': { section: 'Dashboard', title: 'Class Schedule' },
  '/evaluations': { section: 'Dashboard', title: 'Highlights' },
  '/worker-jobs': { section: 'Dashboard', title: 'Admin Upload' },
};

const Header = ({ onOpenSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const currentRoute = routeMeta[location.pathname] || routeMeta['/dashboard'];

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-10">
      <div className="flex items-center justify-between bg-[rgba(244,246,243,0.82)] px-4 py-4 backdrop-blur-md sm:px-6 lg:px-10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-10 w-10 items-center justify-center text-[#62746d] transition hover:text-[var(--dashboard-primary)] lg:hidden"
            aria-label="Open sidebar"
          >
            <MenuIcon />
          </button>

          <nav className="font-dashboard-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#7f938a]">
            <span>{currentRoute.section}</span>
            <ChevronRightIcon />
            <span className="font-bold text-[var(--dashboard-primary)]">{currentRoute.title}</span>
          </nav>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <label className="relative hidden w-64 items-center bg-[rgba(238,243,239,0.95)] px-4 py-2 text-[#62746d] lg:flex">
            <span className="mr-2">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search insights..."
              className="w-full border-none bg-transparent p-0 text-xs outline-none placeholder:text-[#7f938a]"
            />
          </label>

          <div className="flex items-center gap-4 text-[#62746d]">
            <button type="button" className="hidden transition hover:text-[var(--dashboard-primary)] md:inline-flex" aria-label="Notifications">
              <BellIcon />
            </button>
            <button type="button" className="hidden transition hover:text-[var(--dashboard-primary)] md:inline-flex" aria-label="Settings">
              <SettingsIcon />
            </button>
            <div className="hidden h-8 w-px bg-[rgba(98,116,109,0.2)] md:block" />

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu((previous) => !previous)}
                className="text-left text-xs font-bold text-[#172b26]"
              >
                {user?.name || 'User'}
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-3 min-w-[180px] bg-white p-4 shadow-[0_24px_50px_-32px_rgba(16,24,40,0.55)]">
                  <p className="font-headline text-sm font-semibold text-[#172b26]">{user?.name || 'User'}</p>
                  <p className="font-dashboard-mono mt-1 text-[10px] uppercase tracking-[0.2em] text-[#7f938a]">{user?.role || ''}</p>
                  <div className="mt-4 border-t border-[#e5ece7] pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate('/');
                        setShowMenu(false);
                      }}
                      className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--dashboard-primary)] transition hover:opacity-80"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
