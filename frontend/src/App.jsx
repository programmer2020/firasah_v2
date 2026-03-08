import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Schools from './pages/Schools';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Subjects from './pages/Subjects';
import Grades from './pages/Grades';
import Sections from './pages/Sections';
import AudioUpload from './pages/AudioUpload';
import ThemeTest from './components/ThemeTest';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ element }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? element : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/theme-test" element={<ThemeTest />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
      <Route path="/schools" element={<ProtectedRoute element={<Schools />} />} />
      <Route path="/teachers" element={<ProtectedRoute element={<Teachers />} />} />
      <Route path="/classes" element={<ProtectedRoute element={<Classes />} />} />
      <Route path="/subjects" element={<ProtectedRoute element={<Subjects />} />} />
      <Route path="/grades" element={<ProtectedRoute element={<Grades />} />} />
      <Route path="/sections" element={<ProtectedRoute element={<Sections />} />} />
      <Route path="/audio-upload" element={<ProtectedRoute element={<AudioUpload />} />} />

      {/* Default Route */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 Route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
