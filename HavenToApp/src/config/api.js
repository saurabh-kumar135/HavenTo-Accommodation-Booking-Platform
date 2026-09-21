// API configuration for HavenToApp
// Primary: Local Python FastAPI backend (via USB ADB reverse or tethering)
// Fallback: Live Cloud backend on Render
export const LOCAL_URL = 'http://localhost:3009';
export const CLOUD_URL = 'https://havento-accommodation-booking-platform.onrender.com';
export const API_URL = LOCAL_URL;

export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  const base = API_URL || CLOUD_URL;
  if (imagePath.startsWith('uploads/')) return `${base}/${imagePath}`;
  return `${base}/uploads/${imagePath}`;
};
