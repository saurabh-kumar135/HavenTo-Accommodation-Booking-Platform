// API configuration for HavenToApp
// Points to the same HavenTo backend — no backend changes needed!

export const API_URL = 'https://havento-accommodation-booking-platform.onrender.com';

export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('uploads/')) return `${API_URL}/${imagePath}`;
  return `${API_URL}/uploads/${imagePath}`;
};
