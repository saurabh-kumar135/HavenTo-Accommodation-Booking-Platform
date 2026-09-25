export const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (isLocal) {
      return import.meta.env.VITE_API_URL || 'http://localhost:3009';
    }
  }
  return import.meta.env.VITE_API_URL || 'https://havento-accommodation-booking-platform.onrender.com';
};

export const API_URL = getApiUrl();

// Dedicated WebRTC Signaling Server URL (always points to the active Render socket.io server)
export const TOUR_API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3009')
  : 'https://havento-accommodation-booking-platform.onrender.com';

export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('uploads/')) return `${API_URL}/${path}`;
  return `${API_URL}/uploads/${path}`;
};

export default { API_URL, TOUR_API_URL, getImageUrl };
