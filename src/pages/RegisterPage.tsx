import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { salahApi } from '../services/backendApi'

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [calculationMethod, setCalculationMethod] = useState('Karachi')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Post-registration verification state
  const [verificationPending, setVerificationPending] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [devPreviewUrl, setDevPreviewUrl] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please provide your name.')
      return
    }
    if (!email.trim()) {
      setError('Please provide a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)
    try {
      const res = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        prayerCalculationMethod: calculationMethod,
      })

      if (res.requiresEmailVerification) {
        setVerificationPending(true)
        setRegisteredEmail(res.email || email.trim().toLowerCase())
        if (res.previewUrl) {
          setDevPreviewUrl(res.previewUrl)
        }
      } else if (res.user) {
        navigate('/app', { replace: true })
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!registeredEmail) return
    setResendLoading(true)
    setResendMessage(null)
    try {
      const res = await salahApi.resendVerification(registeredEmail)
      setResendMessage(res.message || 'Verification email resent!')
      if (res.previewUrl) {
        setDevPreviewUrl(res.previewUrl)
      }
    } catch (err: any) {
      setError(err.message || 'Could not resend email.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = salahApi.getGoogleOAuthUrl()
  }

  return (
    <div className="min-h-screen bg-[#07241A] flex flex-col justify-between relative selection:bg-amber-300 selection:text-emerald-950 font-sans">
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

      {/* Main Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md bg-[#FAF7EE] rounded-3xl p-6 sm:p-8 border border-[#E4D9C7] shadow-[0_20px_50px_rgba(0,0,0,0.35)] text-[#132A1F] animate-fade-in">
          {verificationPending ? (
            /* Email Verification Sent Screen */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[11px] font-semibold tracking-widest text-[#B58728] uppercase">
                  Verification Required
                </span>
                <h2 className="mt-1 font-serif font-bold text-2xl text-[#122A20]">
                  Check Your Inbox
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[#5D6F66] leading-relaxed">
                  We sent a confirmation link to <strong className="text-[#122A20]">{registeredEmail}</strong>.
                  Please click the link to activate your Salah Companion account.
                </p>
              </div>

              {devPreviewUrl && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left">
                  <p className="text-[11px] text-amber-800 font-medium">
                    🛠️ <strong>Development Mode:</strong> Click below to view the outgoing email:
                  </p>
                  <a
                    href={devPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-xs text-blue-700 underline font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Email Preview</span>
                  </a>
                </div>
              )}

              <div className="pt-4 border-t border-[#E8DFC2] space-y-3">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-[#14291F] border border-[#D5C9B5] hover:bg-[#F2ECE0] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                  <span>{resendLoading ? 'Sending...' : 'Resend Verification Email'}</span>
                </button>
                {resendMessage && (
                  <p className="text-xs text-emerald-700 font-semibold">{resendMessage}</p>
                )}

                <Link
                  to="/login"
                  className="inline-block text-xs font-bold text-[#0C4535] hover:underline"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <>
              <div className="text-center mb-6">
                <span className="text-[11px] font-semibold tracking-widest text-[#B58728] uppercase font-sans">
                  Join Salah Companion
                </span>
                <h1 className="mt-1 font-serif font-bold text-2xl sm:text-3xl text-[#122A20] tracking-tight">
                  Begin Your Journey
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-[#5D6F66]">
                  Track your prayers, explore authentic Hadith, and strengthen your Iman.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#14291F] uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-[#DED4C1] text-sm text-[#14291F] placeholder-stone-400 focus:outline-none focus:border-[#0C4535] focus:ring-2 focus:ring-[#0C4535]/15 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#14291F] uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-[#DED4C1] text-sm text-[#14291F] placeholder-stone-400 focus:outline-none focus:border-[#0C4535] focus:ring-2 focus:ring-[#0C4535]/15 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#14291F] uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 bg-white rounded-xl border border-[#DED4C1] text-sm text-[#14291F] placeholder-stone-400 focus:outline-none focus:border-[#0C4535] focus:ring-2 focus:ring-[#0C4535]/15 transition"
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

                <div>
                  <label className="block text-xs font-bold text-[#14291F] uppercase tracking-wider mb-1">
                    Calculation Standard
                  </label>
                  <select
                    value={calculationMethod}
                    onChange={(e) => setCalculationMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#DED4C1] text-xs sm:text-sm text-[#14291F] focus:outline-none focus:border-[#0C4535] focus:ring-2 focus:ring-[#0C4535]/15 transition"
                  >
                    <option value="Karachi">Islamic University, Karachi (Subcontinent)</option>
                    <option value="MWL">Muslim World League (MWL)</option>
                    <option value="ISNA">ISNA (North America)</option>
                    <option value="UmmAlQura">Umm al-Qura (Makkah)</option>
                    <option value="Egypt">Egyptian General Authority</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-[#14291F] text-sm bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-md flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#14291F]" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account Free</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Google OAuth Option */}
              <div className="mt-4 pt-4 border-t border-[#E8DFC2]">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-[#14291F] text-xs sm:text-sm bg-white hover:bg-stone-50 border border-[#DED4C1] shadow-xs flex items-center justify-center gap-2.5 transition cursor-pointer"
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
                  <span>Continue with Google</span>
                </button>
              </div>

              {/* Footer Navigation */}
              <div className="mt-5 text-center text-xs text-[#5D6F66]">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-[#0C4535] hover:underline">
                  Sign in
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

export default RegisterPage
