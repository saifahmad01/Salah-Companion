import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react'
import { salahApi } from '../services/backendApi'
import { useUnsavedChanges, useUnsavedChangesWarn } from '../context/UnsavedChangesContext'

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const { confirmAction } = useUnsavedChanges()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [devPreviewUrl, setDevPreviewUrl] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  // Track unsaved form input
  const isFormDirty = Boolean(email.trim()) && !submittedEmail && !loading
  useUnsavedChangesWarn('forgot_password_form', isFormDirty, 'Password reset email')

  const handleSafeNavigate = (to: string) => {
    if (isFormDirty) {
      confirmAction(
        {
          title: 'Discard Reset Request?',
          message: 'You have entered an email address. If you leave now, your password reset request will not be sent.',
          confirmLabel: 'Discard & Leave',
          cancelLabel: 'Stay on Page',
          variant: 'unsaved',
        },
        () => navigate(to)
      )
    } else {
      navigate(to)
    }
  }

  // Resend cooldown timer
  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    try {
      const res = await salahApi.forgotPassword(email.trim().toLowerCase())
      setSubmittedEmail(email.trim().toLowerCase())
      if (res.previewUrl) {
        setDevPreviewUrl(res.previewUrl)
      }
      setCooldown(60)
    } catch (err: any) {
      setError(err.message || 'Unable to request password reset. Please try again.')
      if (err.retryAfter) {
        setCooldown(err.retryAfter)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || !submittedEmail || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await salahApi.forgotPassword(submittedEmail)
      if (res.previewUrl) {
        setDevPreviewUrl(res.previewUrl)
      }
      setCooldown(60)
    } catch (err: any) {
      setError(err.message || 'Unable to resend reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07241A] flex flex-col justify-between relative selection:bg-amber-300 selection:text-emerald-950 font-sans">
      {/* Background Islamic Pattern */}
      <div
        className="absolute inset-0 opacity-4 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#D4AF37 1px, transparent 1px), radial-gradient(#D4AF37 1px, #07241A 1px)`,
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 20px 20px',
        }}
      />

      {/* Header */}
      <header className="relative z-10 px-6 py-6 max-w-6xl mx-auto w-full flex items-center justify-between">
        <Link
          to="/"
          onClick={(e) => {
            if (isFormDirty) {
              e.preventDefault()
              handleSafeNavigate('/')
            }
          }}
          className="flex items-center gap-2 text-amber-200/90 hover:text-amber-100 transition"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-900/60 border border-amber-400/30 flex items-center justify-center text-sm">
            🕌
          </div>
          <span className="font-serif tracking-wider font-semibold text-lg text-amber-100">Salah Companion</span>
        </Link>
        <Link
          to="/login"
          onClick={(e) => {
            if (isFormDirty) {
              e.preventDefault()
              handleSafeNavigate('/login')
            }
          }}
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
            <div className="w-14 h-14 rounded-2xl bg-amber-100/80 text-amber-900 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Mail className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold font-serif tracking-tight text-[#0F291E]">
              Forgot Your Password?
            </h1>
            <p className="text-xs text-[#52645A] mt-1">
              Enter the email address associated with your account and we'll send you a password reset link.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {submittedEmail ? (
            <div className="space-y-4 animate-fade-in text-center">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 text-left space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Reset Link Sent</span>
                </div>
                <p className="text-emerald-800/90 leading-relaxed text-[11.5px]">
                  If an account exists for <strong className="text-emerald-950">{submittedEmail}</strong>, we have sent a secure link to reset your password.
                </p>
                <p className="text-stone-500 text-[10.5px]">
                  ⏱️ The link will remain valid for 1 hour. Be sure to check your spam or junk folder if you don't see it shortly.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 rounded-xl bg-[#0C4535] hover:bg-[#083327] active:scale-95 text-white text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Gmail</span>
                </a>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || cooldown > 0}
                  className="w-full py-2.5 rounded-xl bg-white border border-[#DDD7C8] hover:bg-stone-50 text-xs font-semibold text-[#25392F] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>
                    {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend Reset Link'}
                  </span>
                </button>

                {devPreviewUrl && (
                  <a
                    href={devPreviewUrl}
                    className="inline-block text-[11px] text-amber-800 hover:underline font-mono pt-1"
                  >
                    ⚡ Click here for direct local reset link
                  </a>
                )}
              </div>

              <div className="pt-3 border-t border-stone-200/60">
                <Link
                  to="/login"
                  className="text-xs text-[#0E543F] font-semibold hover:underline"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-[#DED4C1] text-sm text-[#14291F] placeholder-stone-400 focus:outline-none focus:border-[#0C4535] focus:ring-2 focus:ring-[#0C4535]/15 transition"
                  />
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
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  onClick={(e) => {
                    if (isFormDirty) {
                      e.preventDefault()
                      handleSafeNavigate('/login')
                    }
                  }}
                  className="text-xs text-[#0E543F] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Remembered your password? Sign In</span>
                </Link>
              </div>
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

export default ForgotPasswordPage
