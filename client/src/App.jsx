import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';

import Index from './pages/store/Index';
import HomeList from './pages/store/HomeList';
import HomeDetail from './pages/store/HomeDetail';
import FavouriteList from './pages/store/FavouriteList';
import Bookings from './pages/store/Bookings';

import AddEditHome from './pages/host/AddEditHome';
import HostHomeList from './pages/host/HostHomeList';
import PricingIntelligence from './pages/host/PricingIntelligence';
import HostWealthDashboard from './pages/host/HostWealthDashboard';
import VirtualTour from './pages/VirtualTour';

import NotFound from './pages/NotFound';
import AIChatWidget from './components/AIChatWidget';

import './index.css';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen bg-gray-100">
            <Routes>
              {}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/homes" element={<HomeList />} />
              <Route path="/homes/:homeId" element={<HomeDetail />} />
              <Route path="/tour" element={<VirtualTour />} />
              <Route path="/tour/:roomId" element={<VirtualTour />} />
              
              {}
              <Route path="/favourites" element={
                <ProtectedRoute>
                  <FavouriteList />
                </ProtectedRoute>
              } />
              <Route path="/bookings" element={
                <ProtectedRoute>
                  <Bookings />
                </ProtectedRoute>
              } />
              
              {}
              <Route path="/host/add-home" element={
                <ProtectedRoute>
                  <AddEditHome />
                </ProtectedRoute>
              } />
              <Route path="/host/edit-home/:homeId" element={
                <ProtectedRoute>
                  <AddEditHome />
                </ProtectedRoute>
              } />
              <Route path="/host/host-home-list" element={
                <ProtectedRoute>
                  <HostHomeList />
                </ProtectedRoute>
              } />
              <Route path="/host/pricing-intelligence" element={
                <ProtectedRoute>
                  <PricingIntelligence />
                </ProtectedRoute>
              } />
              <Route path="/pricing-intelligence" element={
                <ProtectedRoute>
                  <PricingIntelligence />
                </ProtectedRoute>
              } />
              <Route path="/host/analytics" element={
                <ProtectedRoute>
                  <PricingIntelligence />
                </ProtectedRoute>
              } />
              <Route path="/host/wealth" element={
                <ProtectedRoute>
                  <HostWealthDashboard />
                </ProtectedRoute>
              } />
              <Route path="/host/earnings" element={
                <ProtectedRoute>
                  <HostWealthDashboard />
                </ProtectedRoute>
              } />
              
              {}
              <Route path="*" element={<NotFound />} />
            </Routes>
            {/* AI Chat Widget - floating on all pages */}
            <AIChatWidget />
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
