import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicOnlyRoute } from './components/PublicOnlyRoute'
import { AdminRoute } from './components/AdminRoute'
import { ServerWarmupNotice } from './components/ServerWarmupNotice'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
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

          {/* Authentication Route (Google Sign-In) */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />

          {/* Legacy & Alternative Auth Routes Cleanly Redirected to Google Sign-In */}
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
          <Route path="/reset-password" element={<Navigate to="/login" replace />} />
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
