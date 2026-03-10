import React from 'react';
import { useDatabase } from '../context/DatabaseContext';

const DatabaseSwitch = () => {
  const { useNeon, toggleDatabase } = useDatabase();

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
        {useNeon ? '☁️ Neon' : '🗄️ Local'}
      </span>
      
      {/* Toggle Switch */}
      <button
        onClick={() => toggleDatabase(!useNeon)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
          useNeon ? 'bg-brand-600' : 'bg-gray-400'
        }`}
        title={useNeon ? 'Click to use Local Database' : 'Click to use Neon Cloud'}
        aria-label="Database Switch"
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            useNeon ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>

      <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
        {useNeon ? 'Cloud' : 'Local'}
      </span>
    </div>
  );
};

export default DatabaseSwitch;
