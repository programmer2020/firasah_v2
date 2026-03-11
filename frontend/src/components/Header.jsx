import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DatabaseSwitch from './DatabaseSwitch';

const Header = () => {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="fixed top-0 right-0 left-0 bg-white dark:bg-gray-800 shadow-lg z-30 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 md:px-8 py-3 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/dashboard" className="text-2xl md:text-3xl font-outfit font-bold text-brand-600 hover:opacity-90 transition-opacity">
          Firasah AI
        </Link>
        
        {/* Center Navigation */}
        <nav className="hidden md:flex gap-8 flex-1 justify-center"></nav>

        {/* Right Items */}
        <div className="flex items-center gap-6">
          {/* Database Switch */}
          <div className="flex items-center">
            <DatabaseSwitch />
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {user?.name || 'User'} ▼
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 z-50 border border-gray-200 dark:border-gray-700">
                <Link 
                  to="/profile" 
                  onClick={() => setShowMenu(false)}
                  className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-brand-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Profile
                </Link>
                <Link 
                  to="/settings" 
                  onClick={() => setShowMenu(false)}
                  className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-brand-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Settings
                </Link>
                <hr className="my-2 border-gray-200 dark:border-gray-700" />
                <button
                  onClick={() => {
                    handleLogout();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
