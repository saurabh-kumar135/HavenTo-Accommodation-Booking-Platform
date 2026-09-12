import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ErrorAlert from '../../components/ErrorAlert';
import axios from 'axios';
import { API_URL } from '../../config/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/password-reset/validate/${token}`);
      if (response.data.success) {
        setTokenValid(true);
      } else {
        setTokenValid(false);
        setErrors(['Invalid or expired reset token']);
      }
    } catch (error) {
      setTokenValid(false);
      setErrors([error.response?.data?.errors?.[0] || 'Invalid or expired reset token']);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    if (password !== confirmPassword) {
      setErrors(['Passwords do not match']);
      return;
    }

    if (password.length < 6) {
      setErrors(['Password must be at least 6 characters long']);
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/password-reset/reset`, {
        token,
        newPassword: password
      });

      if (response.data.success) {
        
        alert('Password reset successfully! You can now log in with your new password.');
        navigate('/login');
      } else {
        setErrors(response.data.errors || ['Failed to reset password']);
      }
    } catch (error) {
      setErrors([error.response?.data?.errors?.[0] || 'An error occurred. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <>
        <Navbar currentPage="login" />
        <main className="container mx-auto mt-8 p-8 bg-white rounded-lg shadow-md max-w-md text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-red-500 mb-4"></i>
          <p className="text-gray-600">Validating reset token...</p>
        </main>
      </>
    );
  }

  if (!tokenValid) {
    return (
      <>
        <Navbar currentPage="login" />
        <main className="container mx-auto mt-8 p-8 bg-white rounded-lg shadow-md max-w-md">
          <div className="text-center">
            <i className="fas fa-times-circle text-red-500 text-5xl mb-4"></i>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Reset Link</h1>
            <ErrorAlert errors={errors} />
            <p className="text-gray-600 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link 
              to="/forgot-password" 
              className="inline-block bg-red-500 text-white px-6 py-3 rounded-md hover:bg-red-600 transition"
            >
              Request New Link
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar currentPage="login" />
      <main className="container mx-auto mt-8 p-8 bg-white rounded-lg shadow-md max-w-md">
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
            <i className="fas fa-key text-green-500 text-3xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Reset Password</h1>
          <p className="text-gray-600 mt-2">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit}>
          <ErrorAlert errors={errors} />

          <div className="mb-5">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <i className="fas fa-lock"></i>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full pl-10 pr-12 px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
          </div>

          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <i className="fas fa-lock"></i>
              </span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full pl-10 pr-12 px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 text-white py-3 rounded-md hover:bg-red-600 focus:ring-4 focus:ring-red-300 font-medium transition duration-300 flex items-center justify-center"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Resetting Password...
              </>
            ) : (
              <>
                <i className="fas fa-check mr-2"></i>
                Reset Password
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-red-500 hover:underline flex items-center justify-center">
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Login
            </Link>
          </div>
        </form>
      </main>
    </>
  );
};

export default ResetPassword;
