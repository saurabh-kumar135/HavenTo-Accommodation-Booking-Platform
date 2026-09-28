export const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (isLocal) {
      return import.meta.env.VITE_API_URL || 'http://localhost:3009';
    }
  }
  return import.meta.env.VITE_API_URL || '';
};

export const API_URL = getApiUrl();

// Dedicated WebRTC Signaling Server URL
export const TOUR_API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3009')
  : 'http://65.0.71.84';

export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads/')) return path;
  if (path.startsWith('uploads/')) return `/${path}`;
  return `/uploads/${path}`;
};

export default { API_URL, TOUR_API_URL, getImageUrl };
