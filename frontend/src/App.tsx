import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { authAPI } from './lib/api';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Join from './pages/Join';
import Tailors from './pages/Tailors';
import TailorProfile from './pages/TailorProfile';
import Portfolio from './pages/Portfolio';
import Reviews from './pages/Reviews';
import Dashboard from './pages/Dashboard';
import RequestDetail from './pages/RequestDetail';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import Settings from './pages/Settings';

const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function GoogleWrapper({ children }: { children: React.ReactNode }) {
  const [clientId, setClientId] = useState<string>(envClientId);

  useEffect(() => {
    if (!clientId) {
      authAPI.getGoogleConfig()
        .then((res) => {
          if (res.data?.clientId) {
            setClientId(res.data.clientId);
          }
        })
        .catch(() => { });
    }
  }, [clientId]);

  return (
    <GoogleOAuthProvider clientId={clientId || 'google-client-id-placeholder'}>
      {children}
    </GoogleOAuthProvider>
  );
}


function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;

  return <>{children}</>;
}

function App() {
  return (
    <GoogleWrapper>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>

            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ForgotPassword />} />
              <Route path="/join" element={<Join />} />
              <Route path="/tailors" element={<Tailors />} />
              <Route path="/tailors/:id" element={<TailorProfile />} />
              <Route path="/tailors/:id/portfolio" element={<Portfolio />} />
              <Route path="/tailors/:id/reviews" element={<Reviews />} />


              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Layout><Dashboard /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/requests/:id" element={
                <ProtectedRoute>
                  <Layout><RequestDetail /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/messages" element={
                <ProtectedRoute>
                  <Layout><Messages /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/messages/:conversationId" element={
                <ProtectedRoute>
                  <Layout><Messages /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Layout><Profile /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Layout><Settings /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute roles={['admin']}>
                  <Layout><AdminPanel /></Layout>
                </ProtectedRoute>
              } />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleWrapper>
  );
}

export default App;
