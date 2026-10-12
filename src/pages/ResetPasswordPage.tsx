import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react'
import { salahApi } from '../services/backendApi'
import { useAuth } from '../context/AuthContext'

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(token ? null : 'Missing password reset token. Please check the link in your email.')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('Password reset token is missing. Please use the link sent to your email.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must contain at least one letter and one number.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.')
      return
    }

    setLoading(true)
    try {
      const res = await salahApi.resetPassword({ token, password })
      if (res.user) {
        await refreshUser()
      }
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07241A] flex flex-col justify-between relative selection:bg-amber-300 selection:text-emerald-950 font-sans">
      {/* Background Islamic Geometric Pattern */}
      <div
        className="absolute inset-0 opacity-4 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#D4AF37 1px, transparent 1px), radial-gradient(#D4AF37 1px, #07241A 1px)`,
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 20px 20px',
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 px-6 py-6 max-w-6xl mx-auto w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-amber-200/90 hover:text-amber-100 transition">
          <div className="w-8 h-8 rounded-full bg-emerald-900/60 border border-amber-400/30 flex items-center justify-center text-sm">
            🕌
          </div>
          <span className="font-serif tracking-wider font-semibold text-lg text-amber-100">Salah Companion</span>
        </Link>
        <Link
          to="/login"
          className="text-xs font-medium text-emerald-200/80 hover:text-white flex items-center gap-1 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </header>

      {/* Main Content Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-[#FAF6EE] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#E3DAC8] text-[#14291F]">
          {/* Header Icon */}
          <div className="text-center mb-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner ${
              success ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100/80 text-amber-900'
            }`}>
              {success ? <CheckCircle2 className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
            </div>
            <h1 className="text-xl font-bold font-serif tracking-tight text-[#0F291E]">
              {success ? 'Password Reset Complete' : 'Reset Your Password'}
            </h1>
            <p className="text-xs text-[#52645A] mt-1">
              {success
                ? 'Your password has been securely updated. You are now logged in.'
                : 'Choose a new strong password for your Salah Companion account.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-medium leading-relaxed">{error}</span>
                {error.includes('expired') || error.includes('invalid') ? (
                  <p className="pt-1">
                    <Link to="/forgot-password" className="text-rose-900 underline font-semibold">
                      Click here to request a new reset link →
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {success ? (
            <div className="space-y-4 animate-fade-in text-center">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 text-left space-y-1">
                <p className="font-semibold text-emerald-950">✓ Account Security Verified</p>
                <p className="text-emerald-800/90 leading-relaxed">
                  Your new password is now active. You can use it across any device or web browser.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/app', { replace: true })}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-[#14291F] text-sm bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-md flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-[0.99]"
              >
                <span>Launch Salah Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#14291F] uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 chars with letter & digit"
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

              <div>
                <label className="block text-xs font-bold text-[#14291F] uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-[#DED4C1] text-sm text-[#14291F] placeholder-stone-400 focus:outline-none focus:border-[#0C4535] focus:ring-2 focus:ring-[#0C4535]/15 transition"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F0EBE1] border border-[#DDD3C1] text-[11px] text-[#55675E] space-y-0.5">
                <p className="font-semibold text-[#1C2C24]">Password Requirements:</p>
                <p>• Minimum 8 characters</p>
                <p>• Must include at least 1 letter and 1 digit</p>
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-[#14291F] text-sm bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-md flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#14291F]" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password &amp; Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 text-center text-xs text-emerald-300/60 font-serif">
        <p>رفیقِ نماز • Salah Companion • May Allah accept your prayers</p>
      </footer>
    </div>
  )
}

export default ResetPasswordPage
