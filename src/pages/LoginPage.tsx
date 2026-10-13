import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Compass, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { salahApi } from '../services/backendApi'

export const LoginPage: React.FC = () => {
  const { banner, setBanner } = useAuth()
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
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#0C4535] border border-amber-400/20 shadow-xs flex items-center justify-center group-hover:border-amber-400/50 transition">
            <img src="/images/app-logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-serif text-lg font-bold text-white tracking-wide leading-none">
              Salah Companion
            </div>
            <div className="text-[11px] font-sans text-amber-300/80 tracking-widest uppercase mt-0.5">
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

      {/* Main Centered Sign-In Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="bg-[#FAF8F2] border border-[#E6E0D2] rounded-3xl p-6 sm:p-9 shadow-2xl relative overflow-hidden">
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-emerald-600 to-amber-500" />

            {/* Header info */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-900/10 border border-emerald-900/15 text-emerald-900 mb-4 shadow-xs">
                <Compass className="w-7 h-7 text-emerald-800" />
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950 tracking-tight">
                Welcome to Salah Companion
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 mt-2 font-sans max-w-xs mx-auto leading-relaxed">
                Sign in with your Google account to access your prayer tracker, synchronized records, and reminders.
              </p>
            </div>

            {/* Google Sign-In Action */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3.5 py-4 px-5 rounded-2xl bg-white hover:bg-stone-50 border-2 border-stone-200 hover:border-emerald-500/50 text-stone-800 font-semibold text-sm sm:text-base shadow-sm hover:shadow-md transition active:scale-[0.99] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed group"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-emerald-700/30 border-t-emerald-800 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
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
                <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>

              {/* Feature Highlights */}
              <div className="pt-4 border-t border-stone-200/80 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-stone-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Instant access across mobile, tablet, and desktop</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-stone-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Existing prayer logs and streaks linked automatically</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-stone-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Strict zero-spam policy & secure encrypted session</span>
                </div>
              </div>
            </div>

            {/* Ayah Quote Footer */}
            <div className="mt-7 pt-5 border-t border-stone-200/60 text-center">
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

      {/* Minimal Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-emerald-200/60 font-sans">
        <p>© {new Date().getFullYear()} Salah Companion. May Allah accept your prayers and steadfast deeds.</p>
      </footer>
    </div>
  )
}

export default LoginPage
