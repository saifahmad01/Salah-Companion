import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface PublicOnlyRouteProps {
  children: React.ReactElement
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return null
  }

  if (user) {
    const from = (location.state as any)?.from?.pathname || '/app'
    return <Navigate to={from} replace />
  }

  return children
}
