import { createContext, useState, useEffect, useContext } from 'react';
import { checkSession, login as loginApi, logout as logoutApi } from '../services/api';

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
        setUser(response.data.user);
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
        setUser(response.data.user);
        setIsLoggedIn(true);
        return { success: true };
      }
      return { success: false, errors: response.data.errors };
    } catch (error) {
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

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, loading, login, logout, checkSessionStatus }}>
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
