import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const ProtectedLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <Header />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="pt-20 pl-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-8 md:px-6 md:py-12">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ProtectedLayout;
