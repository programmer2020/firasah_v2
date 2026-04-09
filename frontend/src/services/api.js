import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : '');

console.log('[API] Base URL:', API_BASE_URL || '(same origin)');

// Create axios instance with default config and UTF-8 encoding
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
  },
  responseType: 'json',
});

// Add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Do not redirect on failed login/register — those return 401/400 with a message for the form.
    const reqUrl = error.config?.url || '';
    const isAuthAttempt =
      reqUrl.includes('/auth/login') || reqUrl.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
