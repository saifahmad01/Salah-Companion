import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authStorage } from '../services/backendApi'

interface PublicOnlyRouteProps {
  children: React.ReactElement
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  const token = authStorage.getToken()
  const isExpired = authStorage.isTokenExpired(token)

  // 1. If valid unexpired token exists, redirect to app (never show login screen on refresh)
  if (token && !isExpired) {
    const from = (location.state as any)?.from?.pathname || '/app'
    return <Navigate to={from} replace />
  }

  // 2. While verifying without token, keep waiting
  if (loading) {
    return null
  }

  // 3. User is loaded
  if (user) {
    const from = (location.state as any)?.from?.pathname || '/app'
    return <Navigate to={from} replace />
  }

  return children
}
