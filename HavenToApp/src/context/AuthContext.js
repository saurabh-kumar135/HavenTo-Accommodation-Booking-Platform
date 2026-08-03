import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as loginApi, signup as signupApi, logout as logoutApi, getMe } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]           = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading]     = useState(true);

  // On app launch: check if a JWT is already stored
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('havento_jwt');
      if (!token) {
        setLoading(false);
        return;
      }
      // Verify token is still valid by fetching user info
      const res = await getMe();
      if (res.data.success) {
        setUser(res.data.user);
        setIsLoggedIn(true);
      }
    } catch (err) {
      // Token invalid or expired — clear it
      await SecureStore.deleteItemAsync('havento_jwt');
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await loginApi(email, password);
      if (res.data.success) {
        // Save JWT token securely on device
        await SecureStore.setItemAsync('havento_jwt', res.data.token);
        setUser(res.data.user);
        setIsLoggedIn(true);
        return { success: true };
      }
      return { success: false, errors: res.data.errors, error: res.data.error || 'Login failed' };
    } catch (err) {
      return {
        success: false,
        errors: err.response?.data?.errors,
        error: err.response?.data?.error || err.response?.data?.errors?.[0] || 'Network error. Please try again.',
      };
    }
  };

  const signup = async (userData) => {
    try {
      const res = await signupApi(userData);
      if (res.data.success) {
        if (res.data.token) {
          await SecureStore.setItemAsync('havento_jwt', res.data.token);
        }
        if (res.data.user) {
          setUser(res.data.user);
          setIsLoggedIn(true);
        }
        return { success: true, message: res.data.message };
      }
      return { success: false, errors: res.data.errors, error: res.data.error || 'Signup failed' };
    } catch (err) {
      return {
        success: false,
        errors: err.response?.data?.errors,
        error: err.response?.data?.error || err.response?.data?.errors?.[0] || 'Network error. Please try again.',
      };
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (_) {}
    await SecureStore.deleteItemAsync('havento_jwt');
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;
