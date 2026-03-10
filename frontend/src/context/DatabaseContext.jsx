import React, { createContext, useContext, useState, useEffect } from 'react';

const DatabaseContext = createContext();

export const DatabaseProvider = ({ children }) => {
  const [useNeon, setUseNeon] = useState(true); // Neon by default
  const [loading, setLoading] = useState(true);

  // Load preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('useNeonDatabase');
    if (saved !== null) {
      setUseNeon(JSON.parse(saved));
    }
    setLoading(false);
    
    // Notify backend of preference
    notifyBackend(saved !== null ? JSON.parse(saved) : true);
  }, []);

  const notifyBackend = async (neonMode) => {
    try {
      const response = await fetch('http://localhost:5000/api/config/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useNeon: neonMode })
      });
      
      if (!response.ok) {
        console.warn('Backend returned error status:', response.status);
      }
      
      const data = await response.json();
      console.log('Database switched successfully:', data);
    } catch (error) {
      console.warn('Could not notify backend of database selection:', error.message);
    }
  };

  const toggleDatabase = async (neonMode) => {
    setUseNeon(neonMode);
    localStorage.setItem('useNeonDatabase', JSON.stringify(neonMode));
    await notifyBackend(neonMode);
  };

  return (
    <DatabaseContext.Provider value={{ useNeon, toggleDatabase, loading }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context;
};
