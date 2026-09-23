import { createContext, useState, useEffect, useContext } from 'react';
import { checkSession, login as loginApi, logout as logoutApi, googleLogin as googleLoginApi } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    checkSessionStatus();
  }, []);

  const checkSessionStatus = async () => {
    try {
      const response = await checkSession();
      if (response.data.success && response.data.isLoggedIn) {
        const userData = response.data.user || {};
        setUser({
          ...userData,
          favourites: (userData.favourites || []).map((f) => String(f?._id || f)),
        });
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await loginApi(email, password);
      if (response.data.success) {
        if (response.data.token) {
          localStorage.setItem('havento_token', response.data.token);
        }
        const userData = response.data.user || {};
        setUser({
          ...userData,
          favourites: (userData.favourites || []).map((f) => String(f?._id || f)),
        });
        setIsLoggedIn(true);
        return { success: true };
      }
      return { 
        success: false, 
        errors: response.data.errors || ['Invalid credentials'] 
      };
    } catch (error) {
      console.error('Error logging in:', error);
      return { 
        success: false, 
        errors: error.response?.data?.errors || ['An error occurred during login'] 
      };
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
      localStorage.removeItem('havento_token');
      setUser(null);
      setIsLoggedIn(false);
      return { success: true };
    } catch (error) {
      console.error('Error logging out:', error);
      localStorage.removeItem('havento_token');
      return { success: false };
    }
  };

  const updateFavourites = (favourites) => {
    setUser((prev) => {
      if (!prev) return prev;
      const favList = Array.isArray(favourites)
        ? favourites.map((f) => String(f?._id || f))
        : [];
      return { ...prev, favourites: favList };
    });
  };

  const googleLogin = async (googlePayload) => {
    try {
      const response = await googleLoginApi(googlePayload);
      if (response.data.success) {
        if (response.data.token) {
          localStorage.setItem('havento_token', response.data.token);
        }
        const userData = response.data.user || {};
        setUser({
          ...userData,
          favourites: (userData.favourites || []).map((f) => String(f?._id || f)),
        });
        setIsLoggedIn(true);
        return { success: true };
      }
      return {
        success: false,
        errors: response.data.errors || [response.data.message || 'Google sign-in failed']
      };
    } catch (error) {
      console.error('Error logging in with Google:', error);
      return {
        success: false,
        errors: error.response?.data?.errors || [error.response?.data?.message || 'Error during Google sign-in']
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isLoggedIn, loading, login, googleLogin, logout, checkSessionStatus, updateFavourites }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
