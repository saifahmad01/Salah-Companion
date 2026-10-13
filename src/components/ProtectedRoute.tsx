import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Compass } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactElement
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07241A] flex flex-col items-center justify-center text-center p-6 select-none">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
          <Compass className="w-8 h-8 text-amber-300 absolute inset-0 m-auto" />
        </div>
        <h2 className="text-xl font-serif text-white tracking-wide">Salah Companion</h2>
        <p className="text-xs text-emerald-200/70 mt-1 font-sans">Connecting to your prayer space...</p>
      </div>
    )
  }

  if (!user) {
    // Redirect to login preserving intended target URL
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Prevent unverified users from accessing protected features
  if (user.isEmailVerified === false) {
    return <Navigate to={`/login?email=${encodeURIComponent(user.email)}&error=unverified`} replace />
  }

  return children
}
