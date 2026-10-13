import React from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, User, ArrowRight, Users, ShieldCheck, BarChart3 } from 'lucide-react'

export const LandingHero: React.FC = () => {
  const navigate = useNavigate()

  return (
    <section id="home" className="relative w-full overflow-hidden min-h-[580px] lg:min-h-[660px] flex items-center">
      {/* Background Image: Grand Mosque with Minarets, Sunset & Crescent */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/landing_hero_bg.jpg"
          alt="Sheikh Zayed Grand Mosque at Sunset"
          className="w-full h-full object-cover object-[center_right] sm:object-center"
        />
        {/* Emerald Architectural Gradient Overlay matching Reference */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07231A] via-[#082B20]/95 via-35% md:via-45% to-transparent" />
        {/* Subtle geometric star watermark on the left side */}
        <div
          className="absolute inset-y-0 left-0 w-full md:w-1/2 opacity-5 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: "url('/images/islamic-pattern-tile.jpg')",
            backgroundRepeat: 'repeat',
            backgroundSize: '240px',
          }}
        />
        {/* Subtle bottom shadow vignette */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#061F17] to-transparent pointer-events-none" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16 w-full">
        <div className="max-w-2xl">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0D382A]/85 border border-emerald-500/30 text-emerald-100 text-xs font-medium tracking-wide shadow-xs backdrop-blur-xs mb-6 sm:mb-8">
            <BookOpen className="w-3.5 h-3.5 text-amber-300" />
            <span>A Companion for a Closer Connection with Allah</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-serif font-bold text-white text-4xl sm:text-5xl lg:text-[56px] leading-[1.12] tracking-tight">
            Strengthen Your Salah.
            <br />
            Enrich Your Iman.
          </h1>

          {/* Subtitle */}
          <p className="mt-5 sm:mt-6 text-[#CBD8D1] text-base sm:text-lg leading-relaxed max-w-xl font-sans font-normal">
            Build consistency in your five daily prayers, discover authentic Hadith, and grow closer to Allah, one day at
            a time.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2.5 px-6 sm:px-7 py-3.5 rounded-xl font-bold text-[#14291F] text-sm sm:text-base bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-[0_4px_20px_rgba(212,175,55,0.25)] transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2.5 px-6 sm:px-7 py-3.5 rounded-xl font-semibold text-white text-sm sm:text-base bg-[#07261C]/80 hover:bg-[#0B3527] border border-emerald-600/50 shadow-xs backdrop-blur-xs transition-all cursor-pointer"
            >
              <User className="w-4 h-4 text-emerald-300" />
              <span>Login to Your Account</span>
            </button>
          </div>

          {/* Trust Badges */}
          <div className="mt-10 sm:mt-12 pt-4 border-t border-emerald-800/40 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0B3527] border border-emerald-600/40 flex items-center justify-center text-emerald-200 shrink-0 shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs text-[#CCD9D2] font-medium leading-snug">
                Join a growing Muslim community
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0B3527] border border-emerald-600/40 flex items-center justify-center text-emerald-200 shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs text-[#CCD9D2] font-medium leading-snug">
                Authentic resources and reminders
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0B3527] border border-emerald-600/40 flex items-center justify-center text-emerald-200 shrink-0 shadow-xs">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="text-xs text-[#CCD9D2] font-medium leading-snug">
                Track progress towards a better you
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
