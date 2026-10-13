import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicOnlyRoute } from './components/PublicOnlyRoute'
import { AdminRoute } from './components/AdminRoute'
import { ServerWarmupNotice } from './components/ServerWarmupNotice'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AppDashboard from './pages/AppDashboard'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ServerWarmupNotice />
        <Routes>
          {/* Public Landing Page (accessible to logged-out visitors; authenticated users redirected to /app) */}
          <Route
            path="/"
            element={
              <PublicOnlyRoute>
                <LandingPage />
              </PublicOnlyRoute>
            }
          />

          {/* Authentication Route (Email + Password, Google Sign-In, Brevo OTP) */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />

          {/* Dedicated Password Reset Route */}
          <Route
            path="/reset-password"
            element={
              <PublicOnlyRoute>
                <ResetPasswordPage />
              </PublicOnlyRoute>
            }
          />

          {/* Helpful Auth Shortcut Redirects */}
          <Route path="/register" element={<Navigate to="/login?tab=register" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/login?tab=forgot" replace />} />
          <Route path="/verify-email" element={<Navigate to="/login" replace />} />

          {/* Protected Routes (Requires authenticated user session) */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <AppDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Portal (Protected + RBAC: Role === 'ADMIN' only) */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* Convenient redirects for dashboard / tracker */}
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/tracker" element={<Navigate to="/app" replace />} />
          <Route path="/salah" element={<Navigate to="/app" replace />} />

          {/* Fallback to Public Landing Page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
