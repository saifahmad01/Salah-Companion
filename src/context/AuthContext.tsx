import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { salahApi, authStorage, type UserProfile } from '../services/backendApi'
import { oauth, platform } from '../platform'

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<UserProfile | null>
  login: (payload: { email: string; password: string }) => Promise<UserProfile>
  register: (payload: {
    name: string
    email: string
    password: string
    prayerCalculationMethod?: string
    latitude?: number | null
    longitude?: number | null
  }) => Promise<{ success: boolean; requiresVerification: boolean; message: string; email: string; cooldownSeconds?: number; expiresInSeconds?: number }>
  registerVerify: (email: string, otp: string) => Promise<UserProfile>
  registerResend: (email: string) => Promise<{ success: boolean; message: string; cooldownSeconds?: number; expiresInSeconds?: number }>
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; resetToken?: string; resetUrl?: string }>
  resetPassword: (payload: { token: string; password: string }) => Promise<UserProfile>
  sendOtp: (email: string, name?: string) => Promise<{ success: boolean; message: string; email: string; cooldownSeconds?: number; expiresInSeconds?: number }>
  verifyOtp: (email: string, otp: string) => Promise<UserProfile>
  resendOtp: (email: string) => Promise<{ success: boolean; message: string; cooldownSeconds?: number }>
  banner: { type: 'success' | 'error'; message: string } | null
  setBanner: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error'; message: string } | null>>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Frontend-First Session Initialization:
  // If token and cached user exist, render immediately (0ms delay) without blocking spinner
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined' && authStorage.getToken()) {
      return authStorage.getCachedUser()
    }
    return null
  })
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const token = authStorage.getToken()
      const cached = authStorage.getCachedUser()
      // If user has token but no cached profile yet, brief loading
      return Boolean(token && !cached)
    }
    return false
  })
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const initStartedRef = useRef(false)
  const processingCallbackRef = useRef(false)
  const navigate = useNavigate()

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
        authStorage.setCachedUser(res.user)
        return res.user
      }
      return null
    } catch (err: any) {
      // Only clear token if server explicitly returned 401 Unauthorized or 403 Forbidden
      const status = err?.status || err?.response?.status
      if (status === 401 || status === 403) {
        authStorage.clearToken()
        setUser(null)
      } else {
        // Cold start, slow network, or offline: preserve cached user session
        console.warn('[AuthContext] Backend unreachable during refreshUser, preserving cached user session.')
      }
      return null
    }
  }

  const login = async (payload: { email: string; password: string }): Promise<UserProfile> => {
    const res = await salahApi.login(payload)
    if (!res.user) {
      throw new Error('User profile missing in login response')
    }
    setUser(res.user)
    return res.user
  }

  const register = async (payload: {
    name: string
    email: string
    password: string
    prayerCalculationMethod?: string
    latitude?: number | null
    longitude?: number | null
  }) => {
    return await salahApi.register(payload)
  }

  const registerVerify = async (email: string, otp: string): Promise<UserProfile> => {
    const res = await salahApi.registerVerify(email, otp)
    if (!res.user) {
      throw new Error('User profile missing in registration verification response')
    }
    setUser(res.user)
    return res.user
  }

  const registerResend = async (email: string) => {
    return await salahApi.registerResend(email)
  }

  const forgotPassword = async (email: string) => {
    return await salahApi.forgotPassword(email)
  }

  const resetPassword = async (payload: { token: string; password: string }): Promise<UserProfile> => {
    const res = await salahApi.resetPassword(payload)
    if (!res.user) {
      throw new Error('User profile missing in reset password response')
    }
    setUser(res.user)
    return res.user
  }

  const sendOtp = async (email: string, name?: string) => {
    return await salahApi.sendOtp(email, name)
  }

  const verifyOtp = async (email: string, otp: string): Promise<UserProfile> => {
    const res = await salahApi.verifyOtp(email, otp)
    if (!res.user) {
      throw new Error('User profile missing in verification response')
    }
    setUser(res.user)
    return res.user
  }

  const resendOtp = async (email: string) => {
    return await salahApi.resendOtp(email)
  }

  /**
   * Process OAuth response callback from deep links or web search parameters
   */
  const handleOAuthCallbackUrl = async (rawUrlOrSearch: string): Promise<boolean> => {
    if (!rawUrlOrSearch) return false

    let searchPart = ''
    if (rawUrlOrSearch.includes('?')) {
      searchPart = rawUrlOrSearch.substring(rawUrlOrSearch.indexOf('?') + 1).split('#')[0]
    } else if (rawUrlOrSearch.startsWith('?')) {
      searchPart = rawUrlOrSearch.substring(1).split('#')[0]
    }

    let hashPart = ''
    if (rawUrlOrSearch.includes('#')) {
      hashPart = rawUrlOrSearch.substring(rawUrlOrSearch.indexOf('#') + 1)
    }

    const queryParams = new URLSearchParams(searchPart)
    const hashParams = new URLSearchParams(hashPart)

    const authStatus = queryParams.get('auth') || hashParams.get('auth')
    const authError =
      queryParams.get('auth_error') ||
      hashParams.get('auth_error') ||
      queryParams.get('error') ||
      hashParams.get('error')
    const tokenParam =
      queryParams.get('token') ||
      hashParams.get('token') ||
      queryParams.get('access_token') ||
      hashParams.get('access_token')

    if (!authStatus && !authError && !tokenParam) {
      return false
    }

    // Guard against duplicate handling
    if (processingCallbackRef.current) {
      return true
    }
    processingCallbackRef.current = true

    try {
      // Dismiss native Chrome Custom Tab overlay immediately
      await oauth.closeBrowser()

      if (tokenParam || authStatus === 'google_success') {
        if (tokenParam) {
          authStorage.setToken(tokenParam)
        }
        const profile = await refreshUser()
        if (profile) {
          setBanner({
            type: 'success',
            message: '🎉 Successfully signed in! Welcome back to Salah Companion.',
          })
        }
        navigate('/app', { replace: true })
        return true
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
        navigate('/login', { replace: true })
        return true
      }
    } finally {
      if (!platform.isNative()) {
        const targetPath = window.location.pathname.startsWith('/app') ? '/app' : '/login'
        window.history.replaceState({}, document.title, targetPath)
      }
      setLoading(false)
      setTimeout(() => {
        processingCallbackRef.current = false
      }, 1500)
    }

    return false
  }

  useEffect(() => {
    // 1. Listen for native deep link URL (Capacitor AppUrlOpen)
    const removeUrlListener = oauth.addUrlOpenListener(async (url) => {
      console.log('[Auth] Deep link URL received:', url)
      await handleOAuthCallbackUrl(url)
    })

    // 2. Check cold start URL if running natively
    if (platform.isNative()) {
      oauth.getLaunchUrl().then((launchUrl) => {
        if (launchUrl) {
          console.log('[Auth] App launched with URL:', launchUrl)
          handleOAuthCallbackUrl(launchUrl)
        }
      })
    }

    // 3. Web or initial load auth check
    if (!initStartedRef.current) {
      initStartedRef.current = true

      const initAuth = async () => {
        const params = new URLSearchParams(window.location.search)
        const hasOAuthParams = params.has('auth') || params.has('auth_error')

        if (hasOAuthParams) {
          await handleOAuthCallbackUrl(window.location.search)
          return
        }

        const noticeParam = params.get('notice')
        if (noticeParam === 'use_otp') {
          setBanner({
            type: 'success',
            message: 'Please enter your email to receive a secure 6-digit verification code.',
          })
        } else if (noticeParam === 'use_google') {
          setBanner({
            type: 'success',
            message: 'Please sign in with Google or Email OTP to access your account.',
          })
        }

        try {
          await refreshUser()
        } finally {
          setLoading(false)
        }
      }

      initAuth()
    }

    return () => {
      removeUrlListener()
    }
  }, [navigate])

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
        login,
        register,
        registerVerify,
        registerResend,
        forgotPassword,
        resetPassword,
        sendOtp,
        verifyOtp,
        resendOtp,
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
