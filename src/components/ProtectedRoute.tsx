import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authStorage } from '../services/backendApi'
import { DashboardSkeleton } from './SkeletonLoaders'

interface ProtectedRouteProps {
  children: React.ReactElement
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  const token = authStorage.getToken()
  const isExpired = authStorage.isTokenExpired(token)

  // 1. If user is explicitly loaded, render immediately (0ms delay)
  if (user) {
    return children
  }

  // 2. If no token exists at all or token is genuinely expired, redirect to login
  if (!token || isExpired) {
    if (token && isExpired) {
      authStorage.clearToken()
    }
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3. Token exists and is valid: while verifying session in background, show loading skeleton
  // This strictly prevents premature redirects to login during page refresh / Render cold starts
  if (loading) {
    return <DashboardSkeleton />
  }

  // 4. Session restored: fallback user resolution
  const restoredUser = authStorage.getCachedUser()
  if (restoredUser) {
    return children
  }

  // 5. Connecting to backend
  return <DashboardSkeleton />
}
