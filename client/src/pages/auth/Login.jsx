import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import ErrorAlert from '../../components/ErrorAlert';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/');
    } else {
      setErrors(result.errors || ['Login failed']);
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar currentPage="login" />
      <main className="container mx-auto mt-8 p-8 bg-white rounded-lg shadow-md max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 border-b pb-4">Welcome Back</h1>
        
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <ErrorAlert errors={errors} />
          
          {}
          <div className="mb-5">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <i className="fas fa-envelope"></i>
              </span>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                required
              />
            </div>
          </div>
          
          {}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <Link 
                to="/forgot-password"
                className="text-sm text-red-500 hover:text-red-600 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <i className="fas fa-lock"></i>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Enter Your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                required
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
          </div>

          {}
          <div className="mb-4">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                
                window.location.href = 'http://localhost:5000/api/auth/google';
              }}
              onError={() => {
                setErrors(['Google Sign-In failed. Please try again.']);
              }}
              useOneTap
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
              width="100%"
            />
          </div>

          {}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">OR</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#A67C52] text-white py-3 rounded-md hover:bg-[#8B6F47] focus:ring-4 focus:ring-[#D4B896] font-medium transition duration-300 flex items-center justify-center"
          >
            <span>{loading ? 'Signing In...' : 'Sign In'}</span>
            <i className="fas fa-sign-in-alt ml-2"></i>
          </button>
          
          {}
          <p className="text-center mt-6 text-gray-600">
            Don't have an account yet? <Link to="/signup" className="text-red-500 hover:underline">Sign up</Link>
          </p>
        </form>
      </main>
    </>
  );
};

export default Login;
