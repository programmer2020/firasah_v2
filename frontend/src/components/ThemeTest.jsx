import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const ThemeTest = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 p-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold text-brand-600">Firasah Theme Test</h1>
          <button
            onClick={toggleTheme}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            Current: {theme === 'light' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* Color Palette Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Color Palette</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Brand Color */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Brand (Primary)</h3>
              <div className="space-y-2">
                <div className="bg-brand-600 h-12 rounded flex items-center justify-center text-white font-semibold">#465fff</div>
                <div className="bg-brand-500 h-12 rounded flex items-center justify-center text-white font-semibold">Hover</div>
              </div>
            </div>

            {/* Success Color */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Success</h3>
              <div className="space-y-2">
                <div className="bg-success-600 h-12 rounded flex items-center justify-center text-white font-semibold">#039855</div>
                <div className="bg-success-500 h-12 rounded flex items-center justify-center text-white font-semibold">#12b76a</div>
              </div>
            </div>

            {/* Error Color */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Error</h3>
              <div className="space-y-2">
                <div className="bg-error-600 h-12 rounded flex items-center justify-center text-white font-semibold">#d92d20</div>
                <div className="bg-error-500 h-12 rounded flex items-center justify-center text-white font-semibold">#f04438</div>
              </div>
            </div>

            {/* Warning Color */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Warning</h3>
              <div className="space-y-2">
                <div className="bg-warning-600 h-12 rounded flex items-center justify-center text-white font-semibold">#dc6803</div>
                <div className="bg-warning-500 h-12 rounded flex items-center justify-center text-white font-semibold">#f79009</div>
              </div>
            </div>

            {/* Gray Color */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Gray (Neutral)</h3>
              <div className="space-y-2">
                <div className="bg-gray-600 h-12 rounded flex items-center justify-center text-white font-semibold">#475467</div>
                <div className="bg-gray-500 h-12 rounded flex items-center justify-center text-white font-semibold">#667085</div>
              </div>
            </div>

            {/* Blue Light Color */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Blue Light</h3>
              <div className="space-y-2">
                <div className="bg-blue-light-500 h-12 rounded flex items-center justify-center text-white font-semibold">#0ba5ec</div>
                <div className="bg-blue-light-400 h-12 rounded flex items-center justify-center text-white font-semibold">#36bffa</div>
              </div>
            </div>
          </div>
        </div>

        {/* Typography Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Typography</h2>
          
          <div className="space-y-4">
            <div className="font-outfit text-title-2xl text-brand-600">Title 2XL (72px)</div>
            <div className="font-outfit text-title-xl text-brand-600">Title XL (60px)</div>
            <div className="font-outfit text-title-lg text-brand-600">Title LG (48px)</div>
            <div className="font-outfit text-title-md text-brand-600">Title MD (36px)</div>
            <div className="font-outfit text-base text-gray-900 dark:text-gray-100">Body Text (16px)</div>
            <div className="font-outfit text-sm text-gray-600 dark:text-gray-400">Small Text (14px)</div>
          </div>
        </div>

        {/* Shadows Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Shadows</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-20 bg-white dark:bg-gray-800 shadow-theme-xs rounded flex items-center justify-center text-gray-600 dark:text-gray-400">XS Shadow</div>
            <div className="h-20 bg-white dark:bg-gray-800 shadow-theme-sm rounded flex items-center justify-center text-gray-600 dark:text-gray-400">SM Shadow</div>
            <div className="h-20 bg-white dark:bg-gray-800 shadow-theme-md rounded flex items-center justify-center text-gray-600 dark:text-gray-400">MD Shadow</div>
            <div className="h-20 bg-white dark:bg-gray-800 shadow-theme-lg rounded flex items-center justify-center text-gray-600 dark:text-gray-400">LG Shadow</div>
            <div className="h-20 bg-white dark:bg-gray-800 shadow-theme-xl rounded flex items-center justify-center text-gray-600 dark:text-gray-400">XL Shadow</div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-blue-light-50 dark:bg-blue-light-900 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-light-900 dark:text-blue-light-50 mb-2">✅ Theme Integration Complete</h3>
          <p className="text-blue-light-700 dark:text-blue-light-200">
            Tailwind CSS v4 theme system is successfully integrated with professional color palette and typography.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThemeTest;
