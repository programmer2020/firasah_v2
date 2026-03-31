import React from 'react';
import { useDatabase } from '../context/DatabaseContext';

const DatabaseSwitch = ({ className = '' }) => {
  const { useNeon, toggleDatabase, loading } = useDatabase();

  return (
    <div className={`flex items-center gap-3 rounded-[24px] border border-white/50 bg-white/78 px-4 py-3 shadow-[0_18px_40px_-30px_rgba(16,24,40,0.65)] backdrop-blur-xl ${className}`}>
      <span className="font-dashboard-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4e625b]">
        {useNeon ? 'Neon' : 'Local'}
      </span>

      <button
        type="button"
        onClick={() => toggleDatabase(!useNeon)}
        disabled={loading}
        className={`relative inline-flex h-10 w-[54px] items-center rounded-full border border-transparent transition-all duration-200 ${
          useNeon ? 'bg-[#006049]' : 'bg-[#d0d8d4]'
        } ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
        title={loading ? 'Switching database...' : useNeon ? 'Click to use Local Database' : 'Click to use Neon Cloud'}
        aria-label="Database Switch"
      >
        <span
          className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-[0_8px_18px_-10px_rgba(16,24,40,0.55)] transition-transform ${
            useNeon ? 'translate-x-[14px]' : 'translate-x-[4px]'
          }`}
        />
      </button>

      <span className="text-sm font-semibold text-[#425851]">
        {useNeon ? 'Cloud' : 'Local'}
      </span>
    </div>
  );
};

export default DatabaseSwitch;
