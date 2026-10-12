import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react'
import { salahApi, authStorage } from '../services/backendApi'
import { useAuth } from '../context/AuthContext'

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  const token = searchParams.get('token')
  const verifiedParam = searchParams.get('verified')

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'success' | 'error' | 'already_verified'>('error')
  const [message, setMessage] = useState('')

  // Resend form state
  const [resendEmail, setResendEmail] = useState(searchParams.get('email') || '')
  const [resending, setResending] = useState(false)
  const [resendResult, setResendResult] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  // Live countdown timer for resend cooldown (Amazon/Flipkart standard)
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownSeconds])

  useEffect(() => {
    const handleVerify = async () => {
      if (verifiedParam === 'true') {
        const tokenParam = searchParams.get('token')
        if (tokenParam) authStorage.setToken(tokenParam)
        await refreshUser()
        setStatus('success')
        setMessage('Your email has been confirmed successfully! Welcome to Salah Companion.')
        setLoading(false)
        return
      }

      if (verifiedParam === 'false') {
        const errorParam = searchParams.get('error')
        const emailParam = searchParams.get('email')
        if (emailParam) setResendEmail(emailParam)
        setStatus('error')
        if (errorParam === 'token_expired') {
          setMessage('This verification link has expired (links are valid for 24 hours). Please request a new verification link below.')
        } else if (errorParam === 'invalid_or_used_token') {
          setMessage('This verification link is invalid or has already been used. If your account is already verified, you can sign in directly.')
        } else if (errorParam === 'missing_token') {
          setMessage('Verification token is missing. Please check the link in your email.')
        } else {
          setMessage(searchParams.get('message') || 'Verification link is invalid or has expired.')
        }
        setLoading(false)
        return
      }

      if (!token) {
        setStatus('error')
        setMessage('No verification token provided. Please check your verification link.')
        setLoading(false)
        return
      }

      try {
        const res = await salahApi.verifyEmail(token)
        if (res.user) {
          await refreshUser()
        }
        setStatus('success')
        setMessage(
          res.message ||
            `Your email has been confirmed successfully! Welcome to Salah Companion${
              res.user?.name ? ', ' + res.user.name : ''
            }.`
        )
      } catch (err: any) {
        setStatus('error')
        setMessage(err.message || 'Verification link is invalid or has expired.')
      } finally {
        setLoading(false)
      }
    }

    handleVerify()
  }, [token, verifiedParam])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resendEmail.trim() || cooldownSeconds > 0) return
    setResending(true)
    setResendResult(null)
    try {
      const res = await salahApi.resendVerification(resendEmail.trim().toLowerCase())
      setResendResult(res.message || 'A fresh verification link has been sent to your email.')
      setCooldownSeconds(60)
    } catch (err: any) {
      setResendResult(err.message || 'Failed to resend verification email.')
      if (err.retryAfter) {
        setCooldownSeconds(Number(err.retryAfter))
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07241A] flex flex-col justify-between relative selection:bg-amber-300 selection:text-emerald-950 font-sans">
      {/* Background with Mosque */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/landing_hero_bg.jpg"
          alt="Mosque background"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061F17] via-[#07241A]/95 to-[#051A13]" />
      </div>

      {/* Header */}
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

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#FAF7EE] rounded-3xl p-6 sm:p-8 border border-[#E4D9C7] shadow-[0_20px_50px_rgba(0,0,0,0.35)] text-[#132A1F] text-center">
          {loading ? (
            <div className="py-8 space-y-4">
              <RefreshCw className="w-10 h-10 text-emerald-700 animate-spin mx-auto" />
              <h2 className="font-serif font-bold text-2xl text-[#122A20]">Verifying Email...</h2>
              <p className="text-xs sm:text-sm text-[#5D6F66]">
                Please wait while we confirm your Salah Companion account.
              </p>
            </div>
          ) : status === 'success' ? (
            <div className="py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-[11px] font-semibold tracking-widest text-[#B58728] uppercase">
                Email Verified
              </span>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#122A20]">Welcome Aboard!</h1>
              <p className="text-xs sm:text-sm text-[#5D6F66] leading-relaxed max-w-sm mx-auto">{message}</p>
              <div className="pt-4 border-t border-[#E8DFC2]">
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-[#14291F] text-sm bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-md flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <span>Go to Prayer Tracker</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 mx-auto shadow-xs">
                <AlertCircle className="w-8 h-8" />
              </div>
              <span className="text-[11px] font-semibold tracking-widest text-rose-700 uppercase">
                Verification Failed
              </span>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#122A20]">Invalid Link</h1>
              <p className="text-xs sm:text-sm text-rose-700 leading-relaxed max-w-sm mx-auto">{message}</p>

              {/* Resend section */}
              <div className="pt-4 border-t border-[#E8DFC2] text-left">
                <p className="text-xs font-semibold text-[#14291F] mb-2">Request a new verification link:</p>
                <form onSubmit={handleResend} className="space-y-2">
                  <input
                    type="email"
                    required
                    placeholder="Enter your registered email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#DED4C1] text-xs sm:text-sm text-[#14291F] placeholder-stone-400 focus:outline-none focus:border-[#0C4535]"
                  />
                  <button
                    type="submit"
                    disabled={resending || cooldownSeconds > 0}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold border flex items-center justify-center gap-2 transition ${
                      resending || cooldownSeconds > 0
                        ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                        : 'text-[#14291F] border-[#D5C9B5] hover:bg-[#F2ECE0] cursor-pointer'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                    <span>
                      {resending
                        ? 'Sending...'
                        : cooldownSeconds > 0
                        ? `Resend link in ${cooldownSeconds}s`
                        : 'Send New Link'}
                    </span>
                  </button>
                </form>
                {resendResult && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">{resendResult}</p>
                )}
              </div>

              <div className="pt-2">
                <Link to="/login" className="text-xs font-bold text-[#0C4535] hover:underline">
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 w-full py-4 text-center text-[11px] text-emerald-200/50">
        &copy; {new Date().getFullYear()} Salah Companion. Authentic Prayer Tracking & Spiritual Growth.
      </footer>
    </div>
  )
}

export default VerifyEmailPage
