import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { salahApi } from '../services/backendApi'
import { OtpVerificationCard } from '../components/auth/OtpVerificationCard'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { sendOtp, login, banner, setBanner } = useAuth()

  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  // Live countdown timer for resend cooldown
  React.useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownSeconds])

  const from = (location.state as any)?.from?.pathname || '/app'

  // Primary OTP Login submission
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError('Please provide your email address.')
      return
    }

    setLoading(true)
    try {
      const res = await sendOtp({ email: cleanEmail, type: 'LOGIN' })
      if (res.success) {
        setVerificationPendingEmail(cleanEmail)
      } else {
        setError(res.message || 'Failed to dispatch verification code.')
      }
    } catch (err: any) {
      console.error('[OTP Send Error]:', err)
      if (err.code === 'RATE_LIMITED') {
        setCooldownSeconds(err.retryAfter || 60)
        setError(err.message || 'Please wait before requesting another code.')
      } else if (err.code === 'OTP_LOCKED') {
        setError(err.message || 'Too many attempts. Please try again in 15 minutes.')
      } else {
        setError(err.message || 'Unable to deliver verification code. Please check your connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Password fallback submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) {
      setError('Please provide both email and password.')
      return
    }

    setLoading(true)
    try {
      const res = await login({ email: cleanEmail, password })
      if (res.user) {
        navigate(from, { replace: true })
      }
    } catch (err: any) {
      if (err.requiresOtp || err.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationPendingEmail(err.email || cleanEmail)
        return
      }
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleLogin = () => {
    setGoogleLoading(true)
    window.location.href = salahApi.getGoogleOAuthUrl()
  }

  return (
    <div className="min-h-screen bg-[#07241A] flex flex-col justify-between relative selection:bg-amber-300 selection:text-emerald-950 font-sans">
      {/* Global notification banner */}
      {banner && (
        <div
          className={`relative z-20 px-4 py-3 text-xs sm:text-sm font-semibold flex items-center justify-between border-b transition-all duration-300 shadow-md ${
            banner.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between w-full">
            <span>{banner.message}</span>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="ml-4 w-6 h-6 rounded-full bg-black/20 hover:bg-black/35 flex items-center justify-center text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Background with Mosque silhouette and subtle pattern */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/landing_hero_bg.jpg"
          alt="Mosque background"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061F17] via-[#07241A]/95 to-[#051A13]" />
      </div>

      {/* Top Bar with Brand and Back Link */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#0C4535] border border-amber-400/20 shadow-xs flex items-center justify-center">
            <img src="/images/app-logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-serif font-bold text-xl text-white">Salah Companion</span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-200/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md bg-[#FAF7EE] rounded-3xl p-6 sm:p-8 border border-[#E4D9C7] shadow-[0_20px_50px_rgba(0,0,0,0.35)] text-[#132A1F] animate-fade-in">
          {verificationPendingEmail ? (
            <OtpVerificationCard
              email={verificationPendingEmail}
              title="Enter Verification Code"
              subtitle="Enter the 6-digit code sent to your email to securely sign in."
              onSuccess={() => {
                navigate(from, { replace: true })
              }}
              onBack={() => {
                setVerificationPendingEmail(null)
                setError(null)
              }}
            />
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <span className="text-[11px] font-semibold tracking-widest text-[#B58728] uppercase font-sans">
                  Welcome to Salah Companion
                </span>
                <h1 className="mt-1 font-serif font-bold text-2xl sm:text-3xl text-[#122A20] tracking-tight">
                  Sign In to Your Space
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-[#5D6F66]">
                  Quick, passwordless 6-digit OTP verification direct to your email.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Tab Selector (OTP Login vs Password) */}
              <div className="flex rounded-xl bg-[#EFE9DA] p-1 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('otp')
                    setError(null)
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMode === 'otp'
                      ? 'bg-white text-[#0C4535] shadow-xs'
                      : 'text-[#617369] hover:text-[#122A20]'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Email OTP Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('password')
                    setError(null)
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMode === 'password'
                      ? 'bg-white text-[#0C4535] shadow-xs'
                      : 'text-[#617369] hover:text-[#122A20]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Password</span>
                </button>
              </div>

              {/* Form 1: Email-based OTP Login (Primary) */}
              {authMode === 'otp' ? (
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#14291F] uppercase tracking-wider mb-1.5">
                      Your Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-[#DED4C1] text-sm text-[#14291F] placeholder-stone-400 focus:outline-none focus:border-[#0C4535] focus:ring-2 focus:ring-[#0C4535]/15 transition"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#6E8076]">
                      We will dispatch a 6-digit one-time code to this address. Valid for 5 minutes.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || cooldownSeconds > 0}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-[#14291F] text-sm bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-md flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-[0.99] disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#14291F]" />
                        <span>Sending 6-Digit Code...</span>
                      </>
                    ) : cooldownSeconds > 0 ? (
                      <span>Wait {cooldownSeconds}s before resending</span>
                    ) : (
                      <>
                        <span>Send 6-Digit Login Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Form 2: Password Login (Alternative) */
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#14291F] uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-[#DED4C1] text-sm text-[#14291F] placeholder-stone-400 focus:outline-none focus:border-[#0C4535] focus:ring-2 focus:ring-[#0C4535]/15 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-[#14291F] uppercase tracking-wider">
                        Password
                      </label>
                      <Link
                        to="/forgot-password"
                        className="text-xs font-semibold text-[#0C4535] hover:text-[#083327] hover:underline transition"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 bg-white rounded-xl border border-[#DED4C1] text-sm text-[#14291F] placeholder-stone-400 focus:outline-none focus:border-[#0C4535] focus:ring-2 focus:ring-[#0C4535]/15 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-[#14291F] text-sm bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-md flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-[0.99] disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#14291F]" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In with Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Google OAuth Option */}
              <div className="mt-5 pt-5 border-t border-[#E8DFC2]">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading || googleLoading}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-[#14291F] text-xs sm:text-sm bg-white hover:bg-stone-50 border border-[#DED4C1] shadow-xs flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                </button>
              </div>

              {/* Footer Navigation */}
              <div className="mt-6 text-center text-xs text-[#5D6F66]">
                Don't have an account yet?{' '}
                <Link to="/register" className="font-bold text-[#0C4535] hover:underline">
                  Create account free
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-[11px] text-emerald-200/50">
        &copy; {new Date().getFullYear()} Salah Companion. Authentic Prayer Tracking & Spiritual Growth.
      </footer>
    </div>
  )
}

export default LoginPage
