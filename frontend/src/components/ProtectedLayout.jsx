import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const ProtectedLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--dashboard-bg)] text-[var(--dashboard-copy)]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative min-h-screen lg:ml-64">
        <div className="dashboard-grid-overlay pointer-events-none absolute inset-0 opacity-[0.045]" />

        <div className="relative z-10">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />

          <main className="px-4 pb-10 pt-8 sm:px-6 lg:px-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProtectedLayout;
