import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  UserPlus,
  LogIn,
  HelpCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { salahApi } from '../services/backendApi'

type AuthMode = 'login' | 'register' | 'forgot' | 'otp'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    banner,
    setBanner,
    login,
    register,
    forgotPassword,
    sendOtp,
    verifyOtp,
    resendOtp,
    user,
  } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/app', { replace: true })
    }
  }, [user, navigate])

  // Determine initial mode from URL search params (e.g. ?tab=register, ?tab=forgot, ?tab=otp)
  const initialMode = (() => {
    const tab = searchParams.get('tab')
    if (tab === 'register') return 'register'
    if (tab === 'forgot') return 'forgot'
    if (tab === 'otp') return 'otp'
    return 'login'
  })()

  const [mode, setMode] = useState<AuthMode>(initialMode)

  // Sync mode with search params
  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode)
    setFormError(null)
    setFormSuccess(null)
    if (newMode === 'login') {
      setSearchParams({})
    } else {
      setSearchParams({ tab: newMode })
    }
  }

  // Form inputs
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')

  // Show/Hide password toggles
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // OTP Sub-step: 'input_email' | 'enter_code'
  const [otpStep, setOtpStep] = useState<'input_email' | 'enter_code'>('input_email')
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [otpExpiresIn, setOtpExpiresIn] = useState<number>(300)
  const [otpCooldown, setOtpCooldown] = useState<number>(0)
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // UI status
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Password requirement checks (for registration)
  const hasMinLength = password.length >= 8
  const hasLetter = /[A-Za-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword

  // OTP Timers
  useEffect(() => {
    if (mode !== 'otp' || otpStep !== 'enter_code' || otpExpiresIn <= 0) return
    const timer = setInterval(() => {
      setOtpExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [mode, otpStep, otpExpiresIn])

  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCooldown])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // =========================================================================
  // 1. Handle Email + Password Login
  // =========================================================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError('Please enter a valid email address.')
      return
    }

    if (!password) {
      setFormError('Please enter your password.')
      return
    }

    setIsLoading(true)
    try {
      await login({ email: trimmedEmail, password })
      setFormSuccess('Welcome back! Entering your prayer sanctuary...')
      setTimeout(() => {
        navigate('/app', { replace: true })
      }, 500)
    } catch (err: any) {
      setFormError(err.message || 'Invalid email or password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // =========================================================================
  // 2. Handle User Registration (Create Account)
  // =========================================================================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedName || trimmedName.length < 2) {
      setFormError('Please enter your full name (at least 2 characters).')
      return
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError('Please enter a valid email address.')
      return
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setFormError('Password must be at least 8 characters long and contain both letters and numbers.')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.')
      return
    }

    setIsLoading(true)
    try {
      await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
      })
      setFormSuccess('Account created successfully! Welcome to Salah Companion.')
      setTimeout(() => {
        navigate('/app', { replace: true })
      }, 500)
    } catch (err: any) {
      setFormError(err.message || 'Registration failed. Please check your information.')
    } finally {
      setIsLoading(false)
    }
  }

  // =========================================================================
  // 3. Handle Forgot Password
  // =========================================================================
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError('Please enter a valid email address.')
      return
    }

    setIsLoading(true)
    try {
      const res = await forgotPassword(trimmedEmail)
      setFormSuccess(
        res.message || 'If an account exists with that email, password reset instructions have been sent.'
      )
    } catch (err: any) {
      setFormError(err.message || 'Failed to send password reset instructions. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // =========================================================================
  // 4. Handle Email OTP Authentication
  // =========================================================================
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError('Please enter a valid email address.')
      return
    }

    setIsLoading(true)
    try {
      const res = await sendOtp(trimmedEmail, name.trim() || undefined)
      setOtpStep('enter_code')
      setOtpExpiresIn(res.expiresInSeconds || 300)
      setOtpCooldown(res.cooldownSeconds || 60)
      setOtpDigits(['', '', '', '', '', ''])
      setFormSuccess('Verification code sent! Please check your inbox.')

      setTimeout(() => {
        digitInputRefs.current[0]?.focus()
      }, 150)
    } catch (err: any) {
      if (err.code === 'RESEND_COOLDOWN' && err.retryAfter) {
        setOtpCooldown(err.retryAfter)
      }
      setFormError(err.message || 'Failed to send verification code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    const otpCode = otpDigits.join('').trim()
    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      setFormError('Please enter all 6 digits of your verification code.')
      return
    }

    if (otpExpiresIn <= 0) {
      setFormError('Your verification code has expired. Please request a new code.')
      return
    }

    setIsLoading(true)
    try {
      await verifyOtp(email.trim().toLowerCase(), otpCode)
      setFormSuccess('Verification successful! Entering your prayer sanctuary...')
      setTimeout(() => {
        navigate('/app', { replace: true })
      }, 400)
    } catch (err: any) {
      setFormError(err.message || 'Invalid verification code. Please check and try again.')
      if (err.code === 'OTP_MAX_ATTEMPTS_EXCEEDED' || err.code === 'OTP_EXPIRED') {
        setOtpDigits(['', '', '', '', '', ''])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (otpCooldown > 0 || isLoading) return
    setFormError(null)
    setFormSuccess(null)

    setIsLoading(true)
    try {
      const res = await resendOtp(email.trim().toLowerCase())
      setOtpExpiresIn(300)
      setOtpCooldown(res.cooldownSeconds || 60)
      setOtpDigits(['', '', '', '', '', ''])
      setFormSuccess('A new 6-digit verification code has been sent to your email.')
      setTimeout(() => {
        digitInputRefs.current[0]?.focus()
      }, 100)
    } catch (err: any) {
      if (err.code === 'RESEND_COOLDOWN' && err.retryAfter) {
        setOtpCooldown(err.retryAfter)
      }
      setFormError(err.message || 'Failed to resend code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDigitChange = (index: number, value: string) => {
    const numericChar = value.replace(/\D/g, '')
    const newDigits = [...otpDigits]
    if (numericChar.length > 0) {
      newDigits[index] = numericChar.slice(-1)
      setOtpDigits(newDigits)
      if (index < 5) {
        digitInputRefs.current[index + 1]?.focus()
      } else {
        const fullCode = newDigits.join('')
        if (fullCode.length === 6) {
          setTimeout(() => handleVerifyOtp(), 100)
        }
      }
    } else {
      newDigits[index] = ''
      setOtpDigits(newDigits)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pastedData) return

    const newDigits = [...otpDigits]
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || ''
    }
    setOtpDigits(newDigits)

    const nextIndex = Math.min(pastedData.length, 5)
    digitInputRefs.current[nextIndex]?.focus()

    if (pastedData.length === 6) {
      setTimeout(() => handleVerifyOtp(), 100)
    }
  }

  // Google OAuth Flow
  const handleGoogleLogin = () => {
    setGoogleLoading(true)
    window.location.href = salahApi.getGoogleOAuthUrl()
  }

  return (
    <div className="min-h-screen bg-[#07241A] flex flex-col justify-between relative selection:bg-amber-300 selection:text-emerald-950 font-sans">
      {/* Global Notification Banner */}
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

      {/* Mosque Background Vignette */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src="/images/landing_hero_bg.jpg"
          alt="Mosque architecture background"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061F17] via-[#07241A]/95 to-[#051A13]" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#0C4535] border border-amber-400/20 shadow-xs flex items-center justify-center group-hover:border-amber-400/50 transition">
            <img src="/images/app-logo.png" alt="Salah Companion Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-serif text-lg font-bold text-white tracking-wide leading-none">
              Salah Companion
            </div>
            <div className="text-[11px] font-sans text-amber-300/80 tracking-widest uppercase mt-0.5 font-medium">
              رفیقِ نماز
            </div>
          </div>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200/80 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="bg-[#FAF8F2] border border-[#E6E0D2] rounded-3xl p-6 sm:p-9 shadow-2xl relative overflow-hidden text-[#14261E]">
            {/* Top decorative Islamic gold-emerald accent */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-emerald-600 to-amber-500" />

            {/* Amazon / Flipkart Style Segmented Navigation Tabs */}
            {(mode === 'login' || mode === 'register') && (
              <div className="flex border-b border-[#E0D8C6] mb-6 -mx-6 sm:-mx-9 px-6 sm:px-9">
                <button
                  type="button"
                  onClick={() => handleModeChange('login')}
                  className={`flex-1 pb-3 text-sm sm:text-base font-bold text-center cursor-pointer transition relative ${
                    mode === 'login'
                      ? 'text-emerald-950 border-b-2 border-emerald-800'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('register')}
                  className={`flex-1 pb-3 text-sm sm:text-base font-bold text-center cursor-pointer transition relative ${
                    mode === 'register'
                      ? 'text-emerald-950 border-b-2 border-emerald-800'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </span>
                </button>
              </div>
            )}

            {/* In-Form Error / Success Notification */}
            {formError && (
              <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-snug">{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="mb-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-snug">{formSuccess}</span>
              </div>
            )}

            {/* ======================================================= */}
            {/* 1. SIGN IN (EMAIL + PASSWORD)                           */}
            {/* ======================================================= */}
            {mode === 'login' && (
              <div>
                <div className="text-center mb-6">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950 tracking-tight">
                    Welcome Back
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-600 mt-1 font-sans">
                    Sign in to your Salah Companion account
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Email Field */}
                  <div>
                    <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        required
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#DDD7C8] text-sm text-[#14261E] focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition"
                      />
                    </div>
                  </div>

                  {/* Password Field with Show/Hide toggle & Forgot Password link */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleModeChange('forgot')}
                        className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer transition"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full pl-10 pr-11 py-3 rounded-xl bg-white border border-[#DDD7C8] text-sm text-[#14261E] focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Sign In Primary Action Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-5 rounded-2xl font-bold text-[#14291F] text-sm sm:text-base bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-[0_4px_16px_rgba(212,175,55,0.25)] transition-all cursor-pointer active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-emerald-900/30 border-t-emerald-950 rounded-full animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-[#14291F]" />
                        <span>Sign In</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Alternative Quick Option: One-Time Passwordless OTP */}
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => handleModeChange('otp')}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1.5 cursor-pointer hover:underline"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                    <span>Sign in with 6-digit Email OTP instead</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200" />
                  </div>
                  <div className="relative inline-block bg-[#FAF8F2] px-3 text-xs text-stone-500 uppercase tracking-wider font-semibold">
                    or
                  </div>
                </div>

                {/* Google Sign-In Alternative */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-semibold text-xs sm:text-sm shadow-xs hover:shadow-sm transition cursor-pointer active:scale-[0.99] disabled:opacity-75"
                >
                  {googleLoading ? (
                    <div className="w-4 h-4 border-2 border-emerald-700/30 border-t-emerald-800 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  )}
                  <span>Continue with Google</span>
                </button>

                {/* Switch to Register link */}
                <div className="mt-5 text-center text-xs text-stone-600">
                  New to Salah Companion?{' '}
                  <button
                    type="button"
                    onClick={() => handleModeChange('register')}
                    className="font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                  >
                    Create your account
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* 2. CREATE ACCOUNT (REGISTRATION)                        */}
            {/* ======================================================= */}
            {mode === 'register' && (
              <div>
                <div className="text-center mb-6">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950 tracking-tight">
                    Create Account
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-600 mt-1 font-sans">
                    Begin your steadfast daily prayer journey
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Brother / Sister Name"
                        required
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#DDD7C8] text-sm text-[#14261E] focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#DDD7C8] text-sm text-[#14261E] focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition"
                      />
                    </div>
                  </div>

                  {/* Password with Show/Hide toggle */}
                  <div>
                    <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block mb-1.5">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        required
                        className="w-full pl-10 pr-11 py-3 rounded-xl bg-white border border-[#DDD7C8] text-sm text-[#14261E] focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block mb-1.5">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        required
                        className="w-full pl-10 pr-11 py-3 rounded-xl bg-white border border-[#DDD7C8] text-sm text-[#14261E] focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Requirements Checklist */}
                  <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="font-semibold text-stone-700 text-[11px] mb-1">
                      Password Rules:
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-stone-500'}`}>
                      <span className="text-xs">{hasMinLength ? '✓' : '○'}</span>
                      <span>At least 8 characters long</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700 font-medium' : 'text-stone-500'}`}>
                      <span className="text-xs">{hasLetter ? '✓' : '○'}</span>
                      <span>Contains at least one letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-medium' : 'text-stone-500'}`}>
                      <span className="text-xs">{hasNumber ? '✓' : '○'}</span>
                      <span>Contains at least one number</span>
                    </div>
                    {confirmPassword.length > 0 && (
                      <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-medium' : 'text-rose-600'}`}>
                        <span className="text-xs">{passwordsMatch ? '✓' : '✕'}</span>
                        <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                      </div>
                    )}
                  </div>

                  {/* Create Account Action Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !hasMinLength || !hasLetter || !hasNumber || !passwordsMatch}
                    className="w-full py-3.5 px-5 rounded-2xl font-bold text-[#14291F] text-sm sm:text-base bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-[0_4px_16px_rgba(212,175,55,0.25)] transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-emerald-900/30 border-t-emerald-950 rounded-full animate-spin" />
                        <span>Creating Your Account...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 text-[#14291F]" />
                        <span>Create Account</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200" />
                  </div>
                  <div className="relative inline-block bg-[#FAF8F2] px-3 text-xs text-stone-500 uppercase tracking-wider font-semibold">
                    or
                  </div>
                </div>

                {/* Google Sign-In Alternative */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-semibold text-xs sm:text-sm shadow-xs hover:shadow-sm transition cursor-pointer active:scale-[0.99] disabled:opacity-75"
                >
                  {googleLoading ? (
                    <div className="w-4 h-4 border-2 border-emerald-700/30 border-t-emerald-800 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  )}
                  <span>Sign up with Google</span>
                </button>

                {/* Switch to Sign In link */}
                <div className="mt-5 text-center text-xs text-stone-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleModeChange('login')}
                    className="font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                  >
                    Sign in here
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* 3. FORGOT PASSWORD                                      */}
            {/* ======================================================= */}
            {mode === 'forgot' && (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 mb-3 shadow-xs">
                    <HelpCircle className="w-6 h-6 text-[#9A7B2C]" />
                  </div>

                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950 tracking-tight">
                    Forgot Password
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-600 mt-1.5 font-sans max-w-xs mx-auto leading-relaxed">
                    Enter the email address associated with your account and we will send you a secure password reset link.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        required
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#DDD7C8] text-sm text-[#14261E] focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-5 rounded-2xl font-bold text-[#14291F] text-sm sm:text-base bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-[0_4px_16px_rgba(212,175,55,0.25)] transition-all cursor-pointer active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-emerald-900/30 border-t-emerald-950 rounded-full animate-spin" />
                        <span>Sending Reset Link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Password Reset Link</span>
                        <span>→</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleModeChange('login')}
                      className="text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer inline-flex items-center gap-1 py-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ======================================================= */}
            {/* 4. EMAIL OTP LOGIN (PASSWORDLESS OPTION)                */}
            {/* ======================================================= */}
            {mode === 'otp' && otpStep === 'input_email' && (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0C4535]/10 border border-[#0C4535]/20 text-[#0C4535] mb-3 shadow-xs">
                    <KeyRound className="w-6 h-6 text-[#0C4535]" />
                  </div>

                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950 tracking-tight">
                    One-Time Code Sign In
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-600 mt-1.5 font-sans max-w-xs mx-auto leading-relaxed">
                    Enter your email to receive a secure 6-digit login code via Brevo.
                  </p>
                </div>

                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        required
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#DDD7C8] text-sm text-[#14261E] focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-5 rounded-2xl font-bold text-[#14291F] text-sm sm:text-base bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-[0_4px_16px_rgba(212,175,55,0.25)] transition-all cursor-pointer active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-emerald-900/30 border-t-emerald-950 rounded-full animate-spin" />
                        <span>Sending 6-Digit Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send 6-Digit Code</span>
                        <span>→</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleModeChange('login')}
                      className="text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer inline-flex items-center gap-1 py-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Password Sign In</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* OTP Step 2: Enter 6-digit Code */}
            {mode === 'otp' && otpStep === 'enter_code' && (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 mb-3 shadow-xs">
                    <KeyRound className="w-6 h-6 text-[#9A7B2C]" />
                  </div>

                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950 tracking-tight">
                    Enter Verification Code
                  </h1>

                  <div className="mt-2 text-xs sm:text-sm text-stone-600 font-sans max-w-xs mx-auto leading-relaxed">
                    <span>Sent to </span>
                    <strong className="text-emerald-900 font-semibold">{email}</strong>
                  </div>

                  {/* Expiry Countdown Banner */}
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Expires in: </span>
                    <strong className="font-mono">{formatTime(otpExpiresIn)}</strong>
                  </div>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  {/* 6 Digit Inputs */}
                  <div className="flex justify-between items-center gap-2 sm:gap-2.5">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          digitInputRefs.current[idx] = el
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={idx === 0 ? handlePaste : undefined}
                        className={`w-11 sm:w-12 h-14 sm:h-15 text-center text-xl sm:text-2xl font-bold font-mono rounded-2xl bg-white border-2 transition outline-hidden ${
                          digit
                            ? 'border-emerald-700 text-emerald-950 bg-emerald-50/40 shadow-xs'
                            : 'border-[#DDD7C8] text-stone-800 focus:border-emerald-600'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.join('').length !== 6 || otpExpiresIn <= 0}
                    className="w-full py-3.5 px-5 rounded-2xl font-bold text-[#14291F] text-sm sm:text-base bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-[0_4px_16px_rgba(212,175,55,0.25)] transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-emerald-900/30 border-t-emerald-950 rounded-full animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-[#14291F]" />
                        <span>Verify & Sign In</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={otpCooldown > 0 || isLoading}
                      className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-950 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition py-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>{otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : 'Resend Code'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep('input_email')
                        setFormError(null)
                        setFormSuccess(null)
                      }}
                      className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-800 font-medium cursor-pointer transition py-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Change Email</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Ayah Quote Card */}
            <div className="mt-7 pt-5 border-t border-stone-200/70 text-center">
              <p className="text-[12px] italic text-emerald-950/80 font-serif leading-relaxed">
                ”Indeed, prayer has been decreed upon the believers a decree of specified times.“
              </p>
              <p className="text-[10px] text-stone-500 font-sans uppercase tracking-wider mt-1 font-semibold">
                Surah An-Nisa (4:103)
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-emerald-200/60 font-sans">
        <p>© {new Date().getFullYear()} Salah Companion. May Allah accept your prayers and steadfast deeds.</p>
      </footer>
    </div>
  )
}

export default LoginPage
