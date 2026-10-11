import React, { useState } from 'react'
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  MapPin,
  Shield,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Compass,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { salahApi, authStorage, type UserProfile } from '../services/backendApi'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserProfile | null
  onAuthSuccess: (user: UserProfile) => void
  onLogout: () => void
  currentCoords?: { lat: number; lng: number }
  currentCityName?: string
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onAuthSuccess,
  onLogout,
  currentCoords,
  currentCityName,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Verification state
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null)
  const [devPreviewUrl, setDevPreviewUrl] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [calculationMethod, setCalculationMethod] = useState('Karachi')

  // Google OAuth configuration states
  const [googleClientId, setGoogleClientId] = useState(() => {
    try {
      const stored = localStorage.getItem('salah_google_client_id')
      if (stored && stored.includes('.apps.googleusercontent.com')) return stored
      return (
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        '520110657430-7cbd1c04pahgar6o59bp2s0lkub9b29q.apps.googleusercontent.com'
      )
    } catch {
      return (
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        '520110657430-7cbd1c04pahgar6o59bp2s0lkub9b29q.apps.googleusercontent.com'
      )
    }
  })
  const [showGoogleSetup, setShowGoogleSetup] = useState(false)
  const [clientIdInput, setClientIdInput] = useState('')

  // Edit profile state for logged-in user
  const [editName, setEditName] = useState(user?.name || '')
  const [editMethod, setEditMethod] = useState(user?.prayerCalculationMethod || 'Karachi')
  const [isUpdating, setIsUpdating] = useState(false)

  // Sync edit fields when user changes
  React.useEffect(() => {
    if (user) {
      setEditName(user.name)
      setEditMethod(user.prayerCalculationMethod || 'Karachi')
    }
  }, [user])

  // Cooldown timer for resend email
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  if (!isOpen) return null

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setErrorCode(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      const res = await salahApi.login({ email, password })
      if (res.user) {
        setSuccessMessage('Welcome back! Login successful.')
        setTimeout(() => {
          onAuthSuccess(res.user!)
          onClose()
        }, 500)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.')
      if (err.code) {
        setErrorCode(err.code)
      } else if (err.message?.toLowerCase().includes('verify')) {
        setErrorCode('EMAIL_NOT_VERIFIED')
      } else if (err.message?.toLowerCase().includes('no account found')) {
        setErrorCode('ACCOUNT_NOT_FOUND')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setErrorCode(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      const res = await salahApi.register({
        name,
        email,
        password,
        prayerCalculationMethod: calculationMethod,
        latitude: currentCoords?.lat,
        longitude: currentCoords?.lng,
      })

      if (res.requiresEmailVerification) {
        setVerificationPendingEmail(email)
        setDevPreviewUrl(res.previewUrl || null)
        setSuccessMessage('Account created! Please check your email to verify.')
      } else if (res.user) {
        setSuccessMessage('Account created successfully! Welcome to Salah Companion.')
        setTimeout(() => {
          onAuthSuccess(res.user!)
          onClose()
        }, 500)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your inputs.')
      if (err.code) {
        setErrorCode(err.code)
      } else if (err.message?.toLowerCase().includes('already exists')) {
        setErrorCode('EMAIL_ALREADY_EXISTS')
      } else if (err.message?.includes('not verified yet') || err.message?.includes('pending verification')) {
        setErrorCode('EMAIL_UNVERIFIED_EXISTS')
        setVerificationPendingEmail(email)
      }
      if (err.retryAfter) {
        setResendCooldown(err.retryAfter)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async (targetEmail: string) => {
    if (resendCooldown > 0 || isResending) return
    setIsResending(true)
    setErrorMessage(null)

    try {
      const res = await salahApi.resendVerification(targetEmail)
      setSuccessMessage(res.message || 'Verification email resent successfully.')
      if (res.previewUrl) {
        setDevPreviewUrl(res.previewUrl)
      }
      setResendCooldown(60) // 60 seconds cooldown
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification email.')
      if (err.retryAfter || (err.message && err.message.match(/wait (\d+) seconds/))) {
        const match = err.message && err.message.match(/wait (\d+) seconds/)
        const waitTime = err.retryAfter || (match ? parseInt(match[1], 10) : 60)
        setResendCooldown(waitTime)
      }
    } finally {
      setIsResending(false)
    }
  }

  // Google OAuth flow: Backend token exchange and session creation
  const executeGoogleLogin = async (credential: string) => {
    setErrorMessage(null)
    setGoogleLoading(true)

    try {
      const res = await salahApi.googleLogin({
        credential,
        prayerCalculationMethod: calculationMethod,
        latitude: currentCoords?.lat,
        longitude: currentCoords?.lng,
      })

      if (res.user) {
        if (res.token) {
          authStorage.setToken(res.token)
        }
        setSuccessMessage('Signed in with Google successfully!')
        setShowGoogleSetup(false)
        setTimeout(() => {
          onAuthSuccess(res.user!)
          onClose()
        }, 500)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  // Google OAuth button click handler
  const handleGoogleSignIn = async () => {
    setErrorMessage(null)
    const activeClientId = googleClientId.trim()
    const isLiveClientId = activeClientId.includes('.apps.googleusercontent.com')

    // 1. If valid Google Web Client ID is configured and GIS is available in window
    if (isLiveClientId && typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      setGoogleLoading(true)
      try {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: 'openid email profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              setGoogleLoading(false)
              setErrorMessage(`Google popup error: ${tokenResponse.error_description || tokenResponse.error}`)
              return
            }
            if (tokenResponse?.access_token) {
              await executeGoogleLogin(tokenResponse.access_token)
            }
          },
          error_callback: (err: any) => {
            console.warn('[Google] Popup error:', err)
            setGoogleLoading(false)
            setErrorMessage('Google popup was closed or origin is not authorized in Google Cloud Console.')
          },
        })

        tokenClient.requestAccessToken()
        return
      } catch (err: any) {
        console.warn('[Google] initTokenClient failed, redirecting to backend OAuth:', err)
      }
    }

    // 2. Direct redirect to backend Google OAuth 2.0 endpoint
    window.location.href = salahApi.getGoogleOAuthUrl()
  }

  const handleSaveCustomClientId = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = clientIdInput.trim()
    if (!trimmed) return

    setGoogleClientId(trimmed)
    try {
      localStorage.setItem('salah_google_client_id', trimmed)
    } catch {}

    // If it looks like a Google Client ID, immediately trigger the popup!
    if (trimmed.includes('.apps.googleusercontent.com')) {
      setTimeout(() => {
        handleGoogleSignIn()
      }, 100)
    } else {
      setSuccessMessage('Client ID saved! Click "Continue with Google" to test.')
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsUpdating(true)

    try {
      const res = await salahApi.updateProfile({
        name: editName,
        prayerCalculationMethod: editMethod,
        latitude: currentCoords?.lat,
        longitude: currentCoords?.lng,
      })
      setSuccessMessage('Profile updated successfully!')
      onAuthSuccess(res.user)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md rounded-[28px] bg-[#FAF8F3] border border-[#ECE6D8] p-5.5 shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-7 h-7 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-2xl bg-[#0C4535] text-white flex items-center justify-center text-lg shadow-sm">
            🕌
          </div>
          <div>
            <h2 className="text-base font-bold text-[#14261E] leading-tight">
              {user ? 'My Profile' : verificationPendingEmail ? 'Verify Your Email' : 'Salah Companion'}
            </h2>
            <p className="text-[11px] text-[#55675E] leading-tight mt-0.5">
              {user ? 'Manage your account & prayer settings' : verificationPendingEmail ? 'Almost there! Activate your account' : 'Sync your prayers across devices'}
            </p>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {errorMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex flex-col gap-1.5 animate-fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>

            {/* Action 1: Account does not exist -> 1-Click switch to Create Account */}
            {errorCode === 'ACCOUNT_NOT_FOUND' && (
              <button
                type="button"
                onClick={() => {
                  setTab('register')
                  setErrorMessage(null)
                  setErrorCode(null)
                }}
                className="self-start text-[11px] font-bold text-[#0E543F] hover:underline flex items-center gap-1 mt-1 cursor-pointer bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-lg"
              >
                <span>👉 Create an Account with this email</span>
              </button>
            )}

            {/* Action 2: Email already registered -> 1-Click switch to Sign In */}
            {errorCode === 'EMAIL_ALREADY_EXISTS' && (
              <button
                type="button"
                onClick={() => {
                  setTab('login')
                  setErrorMessage(null)
                  setErrorCode(null)
                }}
                className="self-start text-[11px] font-bold text-[#0E543F] hover:underline flex items-center gap-1 mt-1 cursor-pointer bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-lg"
              >
                <span>👉 Sign In to your existing account</span>
              </button>
            )}

            {/* Action 3: Email not verified -> Resend link button */}
            {(errorCode === 'EMAIL_NOT_VERIFIED' || errorCode === 'EMAIL_UNVERIFIED_EXISTS') && (
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleResendVerification(email)}
                  disabled={isResending || resendCooldown > 0}
                  className="text-[11px] font-semibold text-[#0E543F] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50 bg-emerald-100/70 border border-emerald-300 px-2 py-1 rounded-lg"
                >
                  <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 ? `Resend link in ${resendCooldown}s` : 'Resend verification link'}
                  </span>
                </button>
              </div>
            )}

            {/* Action 4: Google linked account -> 1-Click Google Sign In */}
            {errorCode === 'GOOGLE_ACCOUNT' && (
              <button
                type="button"
                onClick={() => handleGoogleSignIn()}
                className="self-start text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1 mt-1 cursor-pointer bg-blue-100/70 border border-blue-300 px-2.5 py-1 rounded-lg"
              >
                <span>👉 Continue with Google</span>
              </button>
            )}
          </div>
        )}

        {successMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* SCREEN 1: VERIFICATION PENDING PROMPT */}
        {verificationPendingEmail && !user ? (
          <div className="pt-2 text-center space-y-3.5 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-800 mx-auto relative">
              <Mail className="w-8 h-8" />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0C4535] text-white flex items-center justify-center text-[10px] font-bold">
                ✓
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#14261E]">Check Your Inbox</h3>
              <p className="text-xs text-[#55675E] mt-1 leading-relaxed">
                We sent a secure verification link to:
                <br />
                <span className="font-semibold text-[#0E543F]">{verificationPendingEmail}</span>
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FAF6EE] border border-[#EDE5D5] text-[11px] text-[#697970] text-left space-y-1">
              <p className="font-medium text-[#1C2C24]">Next Steps:</p>
              <p>1. Open your email app or Gmail.</p>
              <p>2. Click the <strong>"Verify My Email Address"</strong> button.</p>
              <p>3. Return here and sign in to access your prayer tracker.</p>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-1">
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-[#0C4535] hover:bg-[#083327] active:scale-95 text-white text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Gmail</span>
              </a>

              <button
                type="button"
                onClick={() => handleResendVerification(verificationPendingEmail)}
                disabled={isResending || resendCooldown > 0}
                className="w-full py-2 rounded-xl bg-white border border-[#DDD7C8] hover:bg-stone-50 text-xs font-semibold text-[#25392F] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend Verification Email'}
                </span>
              </button>

              {devPreviewUrl && (
                <a
                  href={devPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-[10.5px] text-amber-700 hover:underline font-mono pt-1"
                >
                  ⚡ Click here for direct local verification
                </a>
              )}
            </div>

            <div className="pt-2 border-t border-stone-200/60">
              <button
                type="button"
                onClick={() => {
                  setVerificationPendingEmail(null)
                  setTab('login')
                }}
                className="text-xs text-[#0E543F] font-semibold hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : user ? (
          /* SCREEN 2: LOGGED IN USER PROFILE */
          <div className="pt-2">
            <div className="p-3 rounded-2xl bg-white border border-[#E8E2D4] mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-[#0E543F] font-bold text-sm">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-[#14261E] block">
                    {user.name}
                  </span>
                  <span className="text-[11px] text-stone-500 block truncate max-w-[170px]">
                    {user.email}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" />
                      <span>{user.isEmailVerified ? 'Verified' : 'Unverified'}</span>
                    </span>
                    {user.googleId && (
                      <span className="text-[9.5px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-full">
                        Google Linked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Profile Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#1F3329] uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#DDD7C8] text-xs text-[#14261E] focus:outline-none focus:border-[#0E543F]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#1F3329] uppercase tracking-wider block mb-1">
                  Calculation Method
                </label>
                <div className="relative">
                  <Compass className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                  <select
                    value={editMethod}
                    onChange={(e) => setEditMethod(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#DDD7C8] text-xs text-[#14261E] focus:outline-none focus:border-[#0E543F]"
                  >
                    <option value="Karachi">University of Islamic Sciences, Karachi (India/Pak)</option>
                    <option value="MWL">Muslim World League (MWL)</option>
                    <option value="ISNA">Islamic Society of North America (ISNA)</option>
                    <option value="Egypt">Egyptian General Authority of Survey</option>
                    <option value="Makkah">Umm al-Qura University, Makkah</option>
                    <option value="Dubai">Dubai Official Calculation</option>
                  </select>
                </div>
              </div>

              {/* Location Sync Badge */}
              <div className="p-2.5 rounded-xl bg-[#F4F1E8] border border-[#E4DDD0] text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0E543F]" />
                  <span className="text-[11.5px] font-medium text-[#25392F]">
                    {currentCityName || 'Location Coordinates'}
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 font-mono">
                  {currentCoords ? `${currentCoords.lat.toFixed(2)}°, ${currentCoords.lng.toFixed(2)}°` : 'Default GPS'}
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-2.5 rounded-xl bg-[#0C4535] hover:bg-[#083327] active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Preferences'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLogout()
                    onClose()
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-stone-200/70 hover:bg-stone-300 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5 text-stone-600" />
                  <span>Log Out</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* SCREEN 3: AUTHENTICATION TABS (LOGIN VS REGISTER) */
          <div className="pt-2">
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={() => handleGoogleSignIn()}
              disabled={googleLoading}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-stone-50 border border-[#DDD7C8] text-xs font-semibold text-[#1F2D26] shadow-2xs flex items-center justify-center gap-2.5 transition active:scale-95 cursor-pointer disabled:opacity-60 mb-2"
            >
              {/* Google multi-colored G icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
            </button>

            {/* Google OAuth Details Panel */}
            {showGoogleSetup && (
              <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-3.5 mb-3 text-left space-y-2.5 animate-fade-in shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Google OAuth 2.0 Ready</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGoogleSetup(false)}
                    className="text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-amber-900/90 space-y-2">
                  <p>
                    <span className="font-semibold text-emerald-800">✓ Google Client ID:</span>{' '}
                    <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px] font-mono break-all">{googleClientId}</code>
                  </p>
                  <div className="p-2.5 rounded-xl bg-white/95 border border-amber-300 space-y-1.5 text-[10.5px]">
                    <div className="font-bold text-stone-800 flex items-center justify-between">
                      <span>Google Cloud Console Settings</span>
                      <span className="text-[9.5px] font-normal text-amber-800">Fix redirect_uri_mismatch</span>
                    </div>
                    <div>
                      <span className="text-stone-500 font-medium block">Authorized JavaScript origins:</span>
                      <code className="block bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded font-mono text-[10px] select-all mt-0.5">
                        {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}
                      </code>
                    </div>
                    <div>
                      <span className="text-stone-500 font-medium block">Authorized redirect URIs (Must match exactly):</span>
                      <code className="block bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded font-mono text-[10px] select-all mt-0.5 font-semibold">
                        {`${salahApi.getGoogleOAuthUrl()}/callback`}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Optional Web Client ID Input */}
                <form onSubmit={handleSaveCustomClientId} className="space-y-1.5">
                  <input
                    type="text"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="Paste your-client-id.apps.googleusercontent.com"
                    className="w-full px-2.5 py-1.5 text-[11px] rounded-lg bg-white border border-amber-300 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                  {clientIdInput && (
                    <button
                      type="submit"
                      className="w-full py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-bold transition cursor-pointer"
                    >
                      Save & Launch Google Popup
                    </button>
                  )}
                </form>

                {/* OAuth 2.0 Full Redirect Flow */}
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = salahApi.getGoogleOAuthUrl()
                  }}
                  className="w-full py-2 px-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-bold shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
                  <span>Launch Google OAuth 2.0 Redirect</span>
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="relative flex py-1 items-center mb-3">
              <div className="flex-grow border-t border-[#E5E0D4]"></div>
              <span className="flex-shrink mx-3 text-[10.5px] font-semibold text-stone-400 uppercase tracking-wider">
                Or with email
              </span>
              <div className="flex-grow border-t border-[#E5E0D4]"></div>
            </div>

            {/* Tab switch */}
            <div className="flex p-1 bg-[#EEE8DC] rounded-xl mb-3.5">
              <button
                type="button"
                onClick={() => {
                  setTab('login')
                  setErrorMessage(null)
                  setErrorCode(null)
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  tab === 'login' ? 'bg-[#0C4535] text-white shadow-2xs' : 'text-[#47574E] hover:text-[#14261E]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register')
                  setErrorMessage(null)
                  setErrorCode(null)
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  tab === 'register' ? 'bg-[#0C4535] text-white shadow-2xs' : 'text-[#47574E] hover:text-[#14261E]'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Login Form */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-[#1F3329] uppercase tracking-wider block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#DDD7C8] text-xs text-[#14261E] focus:outline-none focus:border-[#0E543F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#1F3329] uppercase tracking-wider block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-9 py-2 rounded-xl bg-white border border-[#DDD7C8] text-xs text-[#14261E] focus:outline-none focus:border-[#0E543F]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 mt-2 rounded-xl bg-[#0C4535] hover:bg-[#083327] active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loading ? 'Signing in...' : 'Sign In to Salah Companion'}
                </button>
              </form>
            )}

            {/* Registration Form */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-2.5">
                <div>
                  <label className="text-[10.5px] font-bold text-[#1F3329] uppercase tracking-wider block mb-0.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-stone-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Your full name"
                      className="w-full pl-8 pr-3 py-1.8 rounded-xl bg-white border border-[#DDD7C8] text-xs text-[#14261E] focus:outline-none focus:border-[#0E543F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-[#1F3329] uppercase tracking-wider block mb-0.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-stone-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full pl-8 pr-3 py-1.8 rounded-xl bg-white border border-[#DDD7C8] text-xs text-[#14261E] focus:outline-none focus:border-[#0E543F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-[#1F3329] uppercase tracking-wider block mb-0.5">
                    Password (min. 8 chars, 1 letter, 1 digit)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-stone-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="At least 8 chars with letter & digit"
                      className="w-full pl-8 pr-8 py-1.8 rounded-xl bg-white border border-[#DDD7C8] text-xs text-[#14261E] focus:outline-none focus:border-[#0E543F]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-[#1F3329] uppercase tracking-wider block mb-0.5">
                    Prayer Calculation Method
                  </label>
                  <select
                    value={calculationMethod}
                    onChange={(e) => setCalculationMethod(e.target.value)}
                    className="w-full px-3 py-1.8 rounded-xl bg-white border border-[#DDD7C8] text-xs text-[#14261E] focus:outline-none focus:border-[#0E543F]"
                  >
                    <option value="Karachi">University of Islamic Sciences, Karachi (India/Pak)</option>
                    <option value="MWL">Muslim World League (MWL)</option>
                    <option value="ISNA">Islamic Society of North America (ISNA)</option>
                    <option value="Egypt">Egyptian General Authority of Survey</option>
                    <option value="Makkah">Umm al-Qura University, Makkah</option>
                  </select>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-[#0C4535] hover:bg-[#083327] active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{loading ? 'Creating Account...' : 'Create Account with Email'}</span>
                  </button>
                  <p className="text-[10px] text-stone-500 text-center mt-1.5">
                    ✉️ A verification email will be sent to activate your account.
                  </p>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
