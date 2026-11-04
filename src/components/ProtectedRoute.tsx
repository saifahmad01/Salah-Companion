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
  const hasToken = !!authStorage.getToken()

  // 1. If user is already loaded (e.g. from cached profile), render immediately (0ms delay)
  if (user) {
    return children
  }

  // 2. If no token exists at all, redirect immediately to login without waiting
  if (!hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3. If token exists but auth is still validating (no cached profile yet),
  // render the smooth layout skeleton instead of a full-page blocking spinner
  if (loading) {
    return <DashboardSkeleton />
  }

  // 4. Fallback: verification completed but no valid user found
  return <Navigate to="/login" state={{ from: location }} replace />
}
