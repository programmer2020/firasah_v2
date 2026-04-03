import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DatabaseProvider } from './context/DatabaseContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Schools from './pages/Schools';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Subjects from './pages/Subjects';
import Grades from './pages/Grades';
import Sections from './pages/Sections';
import AudioUpload from './pages/AudioUpload';
import FailedFragments from './pages/FailedFragments';
import Schedule from './pages/Schedule';
import EvaluationDashboard from './pages/EvaluationDashboard';
import WorkerJobs from './pages/WorkerJobs';
import TeacherDashboard from './pages/TeacherDashboard';
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

  return isAuthenticated ? element : <Navigate to="/" replace />;
};

// Home Route - Shows Landing if not authenticated, Dashboard if authenticated
const HomeRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Home Route - Landing page or Dashboard if authenticated */}
      <Route path="/" element={<HomeRoute />} />
      
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/theme-test" element={<ThemeTest />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute element={<TeacherDashboard />} />} />
      <Route path="/schools" element={<ProtectedRoute element={<Schools />} />} />
      <Route path="/teachers" element={<ProtectedRoute element={<Teachers />} />} />
      <Route path="/classes" element={<ProtectedRoute element={<Classes />} />} />
      <Route path="/subjects" element={<ProtectedRoute element={<Subjects />} />} />
      <Route path="/grades" element={<ProtectedRoute element={<Grades />} />} />
      <Route path="/sections" element={<ProtectedRoute element={<Sections />} />} />
      <Route path="/audio-upload" element={<ProtectedRoute element={<AudioUpload />} />} />
      <Route path="/failed-fragments" element={<ProtectedRoute element={<FailedFragments />} />} />
      <Route path="/schedule" element={<ProtectedRoute element={<Schedule />} />} />
      <Route path="/evaluations" element={<ProtectedRoute element={<EvaluationDashboard />} />} />
      <Route path="/worker-jobs" element={<ProtectedRoute element={<WorkerJobs />} />} />

      {/* 404 Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <DatabaseProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </DatabaseProvider>
    </BrowserRouter>
  );
}

export default App;
