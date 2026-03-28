import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DatabaseSwitch from '../components/DatabaseSwitch';
import useAutoHideMessage from '../hooks/useAutoHideMessage';

export const Login = () => {
  const [email, setEmail] = useState(() => sessionStorage.getItem('login_email') || localStorage.getItem('rememberedEmail') || '');
  const [password, setPassword] = useState(() => sessionStorage.getItem('login_password') || '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('rememberedEmail'));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Auto-hide error message after 5 seconds
  useAutoHideMessage(error, setError);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate input
      if (!email || !password) {
        throw new Error('Please enter email and password');
      }

      // Call login
      await login(email, password);

      // Remember me logic
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Clear temporary session storage on successful login
      sessionStorage.removeItem('login_email');
      sessionStorage.removeItem('login_password');

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.message ||
          err?.message ||
          'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-300 relative">
      {/* Database Switch - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <DatabaseSwitch />
      </div>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h2 className="text-5xl font-outfit font-bold text-brand-600">
            Firasah
          </h2>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-theme-lg p-8 transition-colors duration-300">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-outfit font-bold text-gray-900 dark:text-white mb-2">
              Login to your account
            </h1>
            <p className="text-gray-600 dark:text-gray-400 font-outfit">
              Welcome back! Please enter your details.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-error-50 dark:bg-error-900 border border-error-200 dark:border-error-700 rounded-lg">
              <p className="text-error-800 dark:text-error-200 font-outfit text-sm">
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 font-outfit">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); sessionStorage.setItem('login_email', e.target.value); }}
                disabled={loading}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-outfit transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 font-outfit">
                Password
              </label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); sessionStorage.setItem('login_password', e.target.value); }}
                disabled={loading}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-outfit transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="w-5 h-5 border border-gray-300 dark:border-gray-600 rounded cursor-pointer accent-brand-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-400 font-outfit">
                  Remember me
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  disabled={loading}
                  className="w-5 h-5 border border-gray-300 dark:border-gray-600 rounded cursor-pointer accent-brand-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-400 font-outfit">
                  Show password
                </span>
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-outfit font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-theme-md hover:shadow-theme-lg"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 space-y-3 text-center">
            <Link
              to="/forgot-password"
              className="block text-brand-600 hover:text-brand-700 font-outfit font-semibold transition-colors duration-200"
            >
              Forgot Password
            </Link>

            <p className="text-gray-600 dark:text-gray-400 font-outfit">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-brand-600 hover:text-brand-700 font-semibold transition-colors duration-200"
              >
                Create new account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-6 font-outfit">
          © 2025 Firasah AI. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
