import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ArrowRight, ArrowLeft, Mail, KeyRound } from 'lucide-react'
import { authStorage } from '../services/backendApi'
import { useAuth } from '../context/AuthContext'
import { OtpVerificationCard } from '../components/auth/OtpVerificationCard'

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  const verifiedParam = searchParams.get('verified')
  const emailParam = searchParams.get('email')

  const [activeEmail, setActiveEmail] = useState(emailParam || '')
  const [inputEmail, setInputEmail] = useState(emailParam || '')
  const [isSuccess, setIsSuccess] = useState(verifiedParam === 'true')

  useEffect(() => {
    if (verifiedParam === 'true') {
      const tokenParam = searchParams.get('token')
      if (tokenParam) authStorage.setToken(tokenParam)
      refreshUser()
      setIsSuccess(true)
    }
  }, [verifiedParam, searchParams, refreshUser])

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputEmail.trim()) return
    setActiveEmail(inputEmail.trim().toLowerCase())
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
        <div className="w-full max-w-md bg-[#FAF7EE] rounded-3xl p-6 sm:p-8 border border-[#E4D9C7] shadow-[0_20px_50px_rgba(0,0,0,0.35)] text-[#132A1F]">
          {isSuccess ? (
            <div className="py-4 space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#0C4535] border border-amber-400/40 flex items-center justify-center text-amber-300 mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-xs font-serif text-[#B58728] tracking-widest uppercase">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#122A20]">Welcome to Salah Companion</h1>
              <p className="text-xs sm:text-sm text-[#5D6F66] leading-relaxed max-w-sm mx-auto">
                Your email has been verified successfully. May Allah bless your prayers and keep you steadfast.
              </p>
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
          ) : activeEmail ? (
            <OtpVerificationCard
              email={activeEmail}
              onSuccess={async () => {
                await refreshUser()
                navigate('/app', { replace: true })
              }}
              onBack={() => {
                setActiveEmail('')
              }}
            />
          ) : (
            <div className="space-y-5 text-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-[#0C4535] border border-amber-400/40 shadow-lg flex items-center justify-center text-amber-300">
                  <KeyRound className="w-8 h-8" />
                </div>
                <p className="mt-3 text-xs font-serif text-[#B58728] tracking-widest uppercase">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
                <h1 className="mt-1 font-serif font-bold text-2xl text-[#122A20]">Email Verification</h1>
                <p className="mt-1.5 text-xs sm:text-sm text-[#5D6F66] max-w-sm mx-auto">
                  Enter your registered email address to verify your 6-digit one-time passcode.
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3.5 text-left">
                <div>
                  <label className="block text-xs font-bold text-[#14291F] uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="your.email@example.com"
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-[#DED4C1] text-sm text-[#14291F] placeholder-stone-400 focus:outline-none focus:border-[#0C4535] focus:ring-2 focus:ring-[#0C4535]/15 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!inputEmail.trim()}
                  className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#0C4535] hover:bg-[#0A3B2D] text-amber-300 border border-amber-400/40 shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Continue to Enter OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="pt-3 border-t border-[#E8DFC2]">
                <Link to="/login" className="text-xs font-bold text-[#0C4535] hover:text-[#B58728] transition">
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 w-full py-4 text-center text-[11px] text-emerald-200/50">
        &copy; {new Date().getFullYear()} Salah Companion. Authentic Prayer Tracking &amp; Spiritual Growth.
      </footer>
    </div>
  )
}

export default VerifyEmailPage
