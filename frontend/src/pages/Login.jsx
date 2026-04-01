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
    <div className="relative flex min-h-screen items-center justify-center bg-[#f8f9fa] p-4 transition-colors duration-300">
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#006049 0.5px, transparent 0.5px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Database Switch - Top Right */}
      <div className="fixed right-6 top-6 z-50">
        <DatabaseSwitch />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 text-center">
          <h2 className="font-headline text-3xl font-extrabold uppercase tracking-[0.15em] text-[#006049]">
            Firasah AI
          </h2>
          <p className="font-mono mt-2 text-[10px] uppercase tracking-[0.3em] text-[#6e7a74]">
            Precision Intelligence
          </p>
        </div>

        {/* Card — tonal layering, no border */}
        <div className="bg-white p-10 shadow-[0_12px_40px_-10px_rgba(0,96,73,0.12)] transition-colors duration-300">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-headline text-3xl font-bold text-[#191c1d]">
              Welcome back
            </h1>
            <p className="mt-2 font-body text-sm text-[#3e4944]">
              Enter your credentials to access the intelligence dashboard.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 border-t-2 border-[#ba1a1a] bg-[#ffdad6] p-4">
              <p className="font-body text-sm text-[#93000a]">
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="font-mono mb-2 block text-[10px] uppercase tracking-[0.2em] text-[#6e7a74]">
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
                className="w-full border-0 border-b-2 border-[#bdc9c2] bg-[#f3f4f5] px-4 py-3.5 font-body text-sm text-[#191c1d] placeholder-[#6e7a74] transition-colors duration-200 focus:border-[#006049] focus:bg-[#edeeef] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="font-mono mb-2 block text-[10px] uppercase tracking-[0.2em] text-[#6e7a74]">
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
                className="w-full border-0 border-b-2 border-[#bdc9c2] bg-[#f3f4f5] px-4 py-3.5 font-body text-sm text-[#191c1d] placeholder-[#6e7a74] transition-colors duration-200 focus:border-[#006049] focus:bg-[#edeeef] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 cursor-pointer border-[#bdc9c2] bg-[#f3f4f5] text-[#006049] focus:ring-[#006049]/20"
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3e4944]">
                  Remember me
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 cursor-pointer border-[#bdc9c2] bg-[#f3f4f5] text-[#006049] focus:ring-[#006049]/20"
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3e4944]">
                  Show password
                </span>
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-gradient-to-r from-[#004634] to-[#006049] px-10 py-4 font-headline text-sm font-bold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 h-px bg-[#bdc9c2]/30" />

          {/* Footer Links */}
          <div className="space-y-3 text-center">
            <Link
              to="/forgot-password"
              className="font-mono block text-[11px] uppercase tracking-[0.18em] text-[#006049] transition-colors duration-200 hover:text-[#0F7B5F]"
            >
              Forgot Password
            </Link>

            <p className="font-body text-sm text-[#3e4944]">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-headline font-bold text-[#006049] transition-colors duration-200 hover:text-[#0F7B5F]"
              >
                Create new account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Text */}
        <p className="font-mono mt-8 text-center text-[10px] uppercase tracking-[0.15em] text-[#6e7a74]/60">
          © 2025 Firasah AI · Precision Intelligence for Education
        </p>
      </div>
    </div>
  );
};

export default Login;
