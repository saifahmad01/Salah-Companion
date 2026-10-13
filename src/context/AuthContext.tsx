import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { salahApi, authStorage, type UserProfile } from '../services/backendApi'

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<UserProfile | null>
  banner: { type: 'success' | 'error'; message: string } | null
  setBanner: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error'; message: string } | null>>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const initStartedRef = useRef(false)

  // Automatically dismiss temporary notification toasts after 4 seconds
  useEffect(() => {
    if (!banner) return
    const timer = setTimeout(() => {
      setBanner(null)
    }, 4000)
    return () => clearTimeout(timer)
  }, [banner])

  const refreshUser = async (): Promise<UserProfile | null> => {
    try {
      const res = await salahApi.getMe()
      if (res?.user) {
        setUser(res.user)
        return res.user
      }
      setUser(null)
      return null
    } catch {
      authStorage.clearToken()
      setUser(null)
      return null
    }
  }

  useEffect(() => {
    if (initStartedRef.current) return
    initStartedRef.current = true

    const initAuth = async () => {
      const params = new URLSearchParams(window.location.search)
      const authStatus = params.get('auth')
      const authError = params.get('auth_error')
      const tokenParam = params.get('token')

      // 1. Google OAuth Callback
      if (authStatus === 'google_success') {
        try {
          if (tokenParam) {
            authStorage.setToken(tokenParam)
          }
          const profile = await refreshUser()
          if (profile) {
            setBanner({
              type: 'success',
              message: '🎉 Successfully signed in with Google! Welcome back to Salah Companion.',
            })
          }
        } finally {
          const targetPath = window.location.pathname.startsWith('/app') ? window.location.pathname : '/app'
          window.history.replaceState({}, document.title, targetPath)
          setLoading(false)
        }
        return
      }

      if (authError) {
        const errorDescriptions: Record<string, string> = {
          CSRF_STATE_MISMATCH: 'Security validation failed (CSRF mismatch). Please try again.',
          access_denied: 'Google sign-in was cancelled.',
          GOOGLE_NOT_CONFIGURED: 'Google Sign-In is not configured yet. Please configure a valid Google Web Client ID (.apps.googleusercontent.com) from Google Cloud Console in your server environment.',
          redirect_uri_mismatch: 'Google OAuth Redirect URI mismatch: Please register your backend callback URL under "Authorized redirect URIs" in Google Cloud Console.',
          MISSING_AUTH_CODE: 'Google did not return an authorization code. Please try again.',
          AUTH_FAILED: 'Google authentication failed. Please try again.',
        }
        setBanner({
          type: 'error',
          message: errorDescriptions[authError] || `Google sign-in failed: ${decodeURIComponent(authError)}`,
        })
        const targetPath = window.location.pathname.startsWith('/app') ? '/login' : window.location.pathname
        window.history.replaceState({}, document.title, targetPath)
        setLoading(false)
        return
      }

      // Notice toast (e.g. redirected from legacy route)
      const noticeParam = params.get('notice')
      if (noticeParam === 'use_google') {
        setBanner({
          type: 'success',
          message: 'Please sign in with Google to access your Salah Companion account.',
        })
      }

      // 2. Regular session restoration
      try {
        await refreshUser()
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const logout = async (): Promise<void> => {
    try {
      await salahApi.logout()
    } finally {
      authStorage.clearToken()
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        logout,
        refreshUser,
        banner,
        setBanner,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
