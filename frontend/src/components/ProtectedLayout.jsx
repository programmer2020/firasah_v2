import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const ProtectedLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--dashboard-bg)] text-[var(--dashboard-copy)]">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
      />

      <div className="relative min-h-screen transition-all duration-300">
        <div className="dashboard-grid-overlay pointer-events-none absolute inset-0 opacity-[0.045]" />

        <div className="relative z-10">
          <div className="transition-all duration-300 lg:ml-64">
            <Header onOpenSidebar={() => setSidebarOpen(true)} />
          </div>

          <main className="px-4 pb-10 pt-[30px] transition-all duration-300 sm:px-6 lg:ml-64 lg:px-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProtectedLayout;
