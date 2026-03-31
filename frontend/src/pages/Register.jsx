import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DatabaseSwitch from '../components/DatabaseSwitch';
import useAutoHideMessage from '../hooks/useAutoHideMessage';

export const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  // Auto-hide error message after 5 seconds
  useAutoHideMessage(error, setError);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate input
      if (!formData.email || !formData.password || !formData.name) {
        throw new Error('Please fill in all fields');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Call register
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      // Redirect to login
      navigate('/login', {
        state: {
          message: 'Registration successful! Please login with your credentials.',
        },
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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

        {/* Card */}
        <div className="bg-white p-10 shadow-[0_12px_40px_-10px_rgba(0,96,73,0.12)] transition-colors duration-300">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-headline text-3xl font-bold text-[#191c1d]">
              Create account
            </h1>
            <p className="mt-2 font-body text-sm text-[#3e4944]">
              Join Firasah AI today. It only takes a minute.
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
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Input */}
            <div>
              <label htmlFor="name" className="font-mono mb-2 block text-[10px] uppercase tracking-[0.2em] text-[#6e7a74]">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
                required
                className="w-full border-0 border-b-2 border-[#bdc9c2] bg-[#f3f4f5] px-4 py-3.5 font-body text-sm text-[#191c1d] placeholder-[#6e7a74] transition-colors duration-200 focus:border-[#006049] focus:bg-[#edeeef] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="font-mono mb-2 block text-[10px] uppercase tracking-[0.2em] text-[#6e7a74]">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
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
                name="password"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                required
                className="w-full border-0 border-b-2 border-[#bdc9c2] bg-[#f3f4f5] px-4 py-3.5 font-body text-sm text-[#191c1d] placeholder-[#6e7a74] transition-colors duration-200 focus:border-[#006049] focus:bg-[#edeeef] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="font-mono mb-2 block text-[10px] uppercase tracking-[0.2em] text-[#6e7a74]">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                required
                className="w-full border-0 border-b-2 border-[#bdc9c2] bg-[#f3f4f5] px-4 py-3.5 font-body text-sm text-[#191c1d] placeholder-[#6e7a74] transition-colors duration-200 focus:border-[#006049] focus:bg-[#edeeef] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Checkboxes for password visibility */}
            <div className="flex items-center justify-between pt-1">
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

              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={showConfirmPassword}
                  onChange={(e) => setShowConfirmPassword(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 cursor-pointer border-[#bdc9c2] bg-[#f3f4f5] text-[#006049] focus:ring-[#006049]/20"
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3e4944]">
                  Show confirm
                </span>
              </label>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-gradient-to-r from-[#004634] to-[#006049] px-10 py-4 font-headline text-sm font-bold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 h-px bg-[#bdc9c2]/30" />

          {/* Footer Links */}
          <div className="text-center">
            <p className="font-body text-sm text-[#3e4944]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-headline font-bold text-[#006049] transition-colors duration-200 hover:text-[#0F7B5F]"
              >
                Sign in
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

export default Register;
