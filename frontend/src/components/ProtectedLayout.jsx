import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const ProtectedLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const getMarginLeft = () => {
    // إذا كانت الـ sidebar مقفولة (collapsed) = margin 80px (w-20)
    if (sidebarCollapsed) return '80px';
    // إذا كانت الـ sidebar مفتوحة (expanded) = margin 256px (w-64)
    return '256px';
  };

  return (
    <div className="min-h-screen bg-[var(--dashboard-bg)] text-[var(--dashboard-copy)]">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        onCollapseChange={setSidebarCollapsed}
      />

      <div 
        className="relative min-h-screen transition-all duration-300"
        style={{ marginLeft: getMarginLeft() }}
      >
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
