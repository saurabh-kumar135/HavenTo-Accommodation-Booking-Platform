import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/api';

// Create axios instance pointing at the HavenTo backend
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// ── Request interceptor: attach JWT token to every request ─────────────────
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('havento_jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn('Could not read token from SecureStore:', e);
  }
  // If sending FormData (file uploads), remove the default JSON content-type
  // so Axios/React Native can set the correct multipart boundary automatically.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// ── Response interceptor: handle 401 (token expired) ──────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('havento_jwt');
    }
    return Promise.reject(error);
  }
);

// ── Auth endpoints ─────────────────────────────────────────────────────────
export const login = (email, password) => api.post('/api/auth/mobile/login', { email, password });
export const signup = (userData) => {
  const payload = {
    firstName: userData.firstName,
    lastName: userData.lastName || '',
    email: userData.email,
    password: userData.password,
    confirmPassword: userData.confirmPassword || userData.password,
    userType: userData.userType || 'guest',
    terms: 'on',
  };
  return api.post('/api/auth/signup', payload);
};
export const logout = () => api.post('/api/auth/mobile/logout');
export const getMe  = () => api.get('/api/auth/mobile/me');

// ── Homes endpoints ────────────────────────────────────────────────────────
export const getHomes       = ()        => api.get('/api/homes');
export const getHomeDetails = (id)      => api.get(`/api/homes/${id}`);

// ── Favourites ─────────────────────────────────────────────────────────────
export const getFavourites       = ()   => api.get('/api/favourites');
export const addToFavourite      = (id) => api.post('/api/favourites', { id });
export const removeFromFavourite = (id) => api.post(`/api/favourites/delete/${id}`);

// ── Bookings ───────────────────────────────────────────────────────────────
export const getBookings = ()     => api.get('/api/bookings');
export const makeBooking = (data) => api.post('/api/bookings', data);

// ── Host endpoints ─────────────────────────────────────────────────────────
export const getHostHomes = ()         => api.get('/api/host/host-home-list');
export const addHome      = (formData) => api.post('/api/host/add-home', formData);
export const editHome     = (formData) => api.post('/api/host/edit-home', formData);
export const deleteHome   = (id)       => api.post(`/api/host/delete-home/${id}`);

export default api;
