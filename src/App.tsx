import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { UnsavedChangesProvider } from './context/UnsavedChangesContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicOnlyRoute } from './components/PublicOnlyRoute'
import { AdminRoute } from './components/AdminRoute'
import { ServerWarmupNotice } from './components/ServerWarmupNotice'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import AppDashboard from './pages/AppDashboard'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UnsavedChangesProvider>
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

          {/* Authentication Routes (Public only - redirects to dashboard if already signed in) */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPasswordPage />
              </PublicOnlyRoute>
            }
          />

          {/* Password Reset Callback Route */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Email Verification Callback Route */}
          <Route path="/verify-email" element={<VerifyEmailPage />} />

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
        </UnsavedChangesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
