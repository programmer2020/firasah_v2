import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';

const DatabaseContext = createContext();

export const DatabaseProvider = ({ children }) => {
  const [useNeon, setUseNeon] = useState(true); // Neon by default
  const [loading, setLoading] = useState(true);
  const didInitRef = useRef(false);

  const getBackendDatabaseMode = async () => {
    const response = await api.get('/config/database/status');
    return Boolean(response?.data?.database?.isUsingNeon);
  };

  // Load preference from localStorage on mount
  useEffect(() => {
    if (didInitRef.current) {
      return;
    }
    didInitRef.current = true;

    const initializePreference = async () => {
      const saved = localStorage.getItem('useNeonDatabase');
      const preferredMode = saved !== null ? JSON.parse(saved) : true;
      setUseNeon(preferredMode);

      const actualMode = await notifyBackend(preferredMode);
      setUseNeon(actualMode);
      localStorage.setItem('useNeonDatabase', JSON.stringify(actualMode));
      setLoading(false);
    };

    void initializePreference();
  }, []);

  const notifyBackend = async (neonMode) => {
    try {
      const response = await api.post('/config/database', { useNeon: neonMode });
      
      if (!response.data?.success) {
        console.warn('Backend returned unsuccessful response:', response.data);
      }

      console.log('Database switched successfully:', response.data);
      return Boolean(response?.data?.database?.isUsingNeon);
    } catch (error) {
      const backendMessage = error?.response?.data?.message;
      console.warn('Could not notify backend of database selection:', backendMessage || error.message);

      // Best effort: query current backend status so UI reflects real source of truth.
      try {
        return await getBackendDatabaseMode();
      } catch (statusError) {
        console.warn('Could not fetch backend database status:', statusError?.message || statusError);
        return neonMode;
      }
    }
  };

  const toggleDatabase = async (neonMode) => {
    setLoading(true);

    const actualMode = await notifyBackend(neonMode);
    setUseNeon(actualMode);
    localStorage.setItem('useNeonDatabase', JSON.stringify(actualMode));

    setLoading(false);
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
