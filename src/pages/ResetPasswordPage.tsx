import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  KeyRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { resetPassword, user } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/app', { replace: true })
    }
  }, [user, navigate])

  const tokenParam = searchParams.get('token') || ''
  const emailParam = searchParams.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Password validation checks
  const hasMinLength = password.length >= 8
  const hasLetter = /[A-Za-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!tokenParam) {
      setFormError('Invalid or missing password reset token. Please request a new link.')
      return
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setFormError('Password must be at least 8 characters long and contain both letters and numbers.')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify both fields.')
      return
    }

    setIsLoading(true)
    try {
      await resetPassword({ token: tokenParam, password })
      setFormSuccess('Password reset successfully! Logging you into your prayer sanctuary...')
      setTimeout(() => {
        navigate('/app', { replace: true })
      }, 1200)
    } catch (err: any) {
      setFormError(err.message || 'Failed to reset password. The link may have expired.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07241A] flex flex-col justify-between relative selection:bg-amber-300 selection:text-emerald-950 font-sans">
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
          to="/login"
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200/80 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </header>

      {/* Main Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="bg-[#FAF8F2] border border-[#E6E0D2] rounded-3xl p-6 sm:p-9 shadow-2xl relative overflow-hidden text-[#14261E]">
            {/* Top decorative Islamic gold-emerald accent */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-emerald-600 to-amber-500" />

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-13 h-13 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 mb-3 shadow-xs">
                <KeyRound className="w-6 h-6 text-[#9A7B2C]" />
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950 tracking-tight">
                Reset Your Password
              </h1>

              {emailParam ? (
                <p className="text-xs sm:text-sm text-stone-600 mt-1.5 font-sans">
                  Account: <strong className="text-emerald-900 font-semibold">{emailParam}</strong>
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-stone-600 mt-1.5 font-sans">
                  Enter your new password below to regain secure access.
                </p>
              )}
            </div>

            {/* Error Notification */}
            {formError && (
              <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-snug">{formError}</span>
              </div>
            )}

            {/* Success Notification */}
            {formSuccess && (
              <div className="mb-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-snug">{formSuccess}</span>
              </div>
            )}

            {!tokenParam ? (
              <div className="text-center py-4">
                <p className="text-sm text-rose-700 font-medium mb-4">
                  Missing password reset token in link. Please request a new password reset.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs transition"
                >
                  Return to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block mb-1.5">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      autoFocus
                      className="w-full pl-10 pr-11 py-3 rounded-xl bg-white border border-[#DDD7C8] text-sm text-[#14261E] focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block mb-1.5">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      className="w-full pl-10 pr-11 py-3 rounded-xl bg-white border border-[#DDD7C8] text-sm text-[#14261E] focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements Checklist */}
                <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="font-semibold text-stone-700 text-[11px] mb-1">
                    Password Requirements:
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

                <button
                  type="submit"
                  disabled={isLoading || !hasMinLength || !hasLetter || !hasNumber || !passwordsMatch}
                  className="w-full py-3.5 px-5 rounded-2xl font-bold text-[#14291F] text-sm sm:text-base bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-[0_4px_16px_rgba(212,175,55,0.25)] transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-emerald-900/30 border-t-emerald-950 rounded-full animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#14291F]" />
                      <span>Set New Password</span>
                    </>
                  )}
                </button>
              </form>
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

export default ResetPasswordPage
