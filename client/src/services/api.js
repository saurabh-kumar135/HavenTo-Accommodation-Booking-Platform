import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3009';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('havento_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const checkSession = () => api.get('/api/auth/check-session');
export const login = (email, password) => api.post('/api/auth/login', { email, password });
export const signup = (userData) => api.post('/api/auth/signup', userData);
export const logout = () => api.post('/api/auth/logout');

export const getIndex = () => api.get('/api');
export const getHomes = () => api.get('/api/homes');
export const getHomeDetails = (homeId) => api.get(`/api/homes/${homeId}`);
export const getBookings = () => api.get('/api/bookings');
export const getFavourites = () => api.get('/api/favourites');
export const addToFavourite = (homeId) => api.post('/api/favourites', { id: homeId });
export const removeFromFavourite = (homeId) => api.post(`/api/favourites/delete/${homeId}`);

export const getAddHome = () => api.get('/api/host/add-home');
export const addHome = (formData) => {
  return api.post('/api/host/add-home', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
export const getHostHomes = () => api.get('/api/host/host-home-list');
export const getEditHome = (homeId) => api.get(`/api/host/edit-home/${homeId}?editing=true`);
export const editHome = (formData) => {
  return api.post('/api/host/edit-home', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
export const deleteHome = (homeId) => api.post(`/api/host/delete-home/${homeId}`);

// AI Agent
export const chatAgent = (message, chatHistory = []) => api.post('/api/agent/chat', { message, chatHistory });

export default api;
