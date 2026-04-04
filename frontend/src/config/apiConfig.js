// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? '' : `${window.location.origin}`);

export const getApiUrl = (endpoint) => {
  // In dev, use relative URLs (Vite proxy will handle forwarding to localhost:5000)
  // In prod, use full path
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

export default API_BASE_URL;
