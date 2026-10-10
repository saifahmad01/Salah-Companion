import React from 'react'
import { ArrowRight, BookOpen, BarChart3 } from 'lucide-react'

interface LandingFeaturesProps {
  onCardClick?: (feature: 'tracker' | 'hadith' | 'progress') => void
}

// Custom Mosque Dome silhouette icon matching the reference card
const MosqueDomeIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Crescent on spire */}
    <path d="M12 2a1.2 1.2 0 0 0-.2.6c.1.3.3.5.6.5.4 0 .8.4.8.8s-.4.8-.8.8a1 1 0 0 1-.8-.4c-.1.3-.1.6 0 .9.3.6.9 1 1.6 1 .9 0 1.6-.7 1.6-1.6 0-.8-.6-1.5-1.4-1.6-.5 0-.7-.5-.8-1z" />
    <path d="M11.5 5.2h1v1.8h-1z" />
    {/* Dome shape with pointed top */}
    <path d="M12 6.5C8.8 9.5 8 12.8 8 15h8c0-2.2-.8-5.5-4-8.5z" />
    {/* Mosque base */}
    <path d="M6.5 15.5h11v2h-11z" />
    <path d="M5 18h14v1.5H5z" />
  </svg>
)

export const LandingFeatures: React.FC<LandingFeaturesProps> = ({ onCardClick }) => {
  return (
    <section id="features" className="relative w-full z-20">
      {/* Top Architectural Islamic Arch Transition */}
      <div className="relative w-full overflow-hidden leading-none -mt-1">
        <svg
          viewBox="0 0 1440 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-8 sm:h-12 md:h-16 block"
          preserveAspectRatio="none"
        >
          <path
            d="M0,70 L1440,70 L1440,30 C1340,30 1260,70 1140,70 C1000,70 940,20 720,20 C500,20 440,70 300,70 C180,70 100,30 0,30 Z"
            fill="#FAF7EE"
          />
        </svg>
      </div>

      {/* Main Ivory Features Container */}
      <div className="relative bg-[#FAF7EE] text-[#132A1F] px-4 sm:px-6 lg:px-8 pt-4 pb-14 sm:pb-20">
        {/* Subtle Islamic Geometric Pattern Watermark */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none mix-blend-multiply"
          style={{
            backgroundImage: "url('/images/islamic-pattern-tile.jpg')",
            backgroundRepeat: 'repeat',
            backgroundSize: '220px',
          }}
        />

        <div className="relative max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-[#B58728] uppercase font-sans">
              &mdash; OUR FEATURES &mdash;
            </span>

            <h2 className="mt-3 font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-[#122A20] tracking-tight">
              Everything You Need on Your Spiritual Journey
            </h2>

            <p className="mt-2 text-sm sm:text-base text-[#5D6F66] font-sans">
              Simple tools, authentic knowledge, and meaningful progress &mdash; all in one place.
            </p>
          </div>

          {/* Three Feature Cards Grid */}
          <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {/* CARD 1: Track Your Five Daily Prayers */}
            <div
              onClick={() => onCardClick?.('tracker')}
              className="group relative bg-[#FFFDF9] rounded-2xl p-5 sm:p-6 border border-[#E9E0CE] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] hover:border-[#D9CCA8] transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#EFE4CF] text-[#143224] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <MosqueDomeIcon className="w-6 h-6 text-[#1A3828]" />
                </div>

                <div className="flex flex-col">
                  <h3 className="font-sans font-bold text-[#122A1F] text-base group-hover:text-[#0C4535] transition-colors leading-snug">
                    Track Your Five Daily Prayers
                  </h3>
                  <p className="mt-1 text-xs text-[#5D6F66] leading-relaxed line-clamp-3">
                    Never miss a prayer again. Get prayer time reminders, track your daily Salah, and build
                    consistency with a clean and simple interface.
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EFE3C6] group-hover:bg-[#E5D5B0] text-[#7A5A1A] flex items-center justify-center shrink-0 shadow-xs transition-colors">
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* CARD 2: Daily Authentic Hadith */}
            <div
              onClick={() => onCardClick?.('hadith')}
              className="group relative bg-[#FFFDF9] rounded-2xl p-5 sm:p-6 border border-[#E9E0CE] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] hover:border-[#D9CCA8] transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#EFE4CF] text-[#143224] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5 text-[#1A3828]" />
                </div>

                <div className="flex flex-col">
                  <h3 className="font-sans font-bold text-[#122A1F] text-base group-hover:text-[#0C4535] transition-colors leading-snug">
                    Daily Authentic Hadith
                  </h3>
                  <p className="mt-1 text-xs text-[#5D6F66] leading-relaxed line-clamp-3">
                    Read authentic Hadith from trusted sources every day. Gain wisdom, strengthen your Iman, and apply
                    the teachings in your daily life.
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EFE3C6] group-hover:bg-[#E5D5B0] text-[#7A5A1A] flex items-center justify-center shrink-0 shadow-xs transition-colors">
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* CARD 3: Monitor Your Spiritual Progress */}
            <div
              onClick={() => onCardClick?.('progress')}
              className="group relative bg-[#FFFDF9] rounded-2xl p-5 sm:p-6 border border-[#E9E0CE] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] hover:border-[#D9CCA8] transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#EFE4CF] text-[#143224] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-5 h-5 text-[#1A3828]" />
                </div>

                <div className="flex flex-col">
                  <h3 className="font-sans font-bold text-[#122A1F] text-base group-hover:text-[#0C4535] transition-colors leading-snug">
                    Monitor Your Spiritual Progress
                  </h3>
                  <p className="mt-1 text-xs text-[#5D6F66] leading-relaxed line-clamp-3">
                    Track your Salah consistency, view your prayer history, and see your growth over time. Small steps
                    lead to a stronger Iman.
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EFE3C6] group-hover:bg-[#E5D5B0] text-[#7A5A1A] flex items-center justify-center shrink-0 shadow-xs transition-colors">
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Architectural Scalloped Arch Transition revealing Mosque & Quran Stand */}
      <div className="relative w-full overflow-hidden leading-none -mb-1">
        <svg
          viewBox="0 0 1440 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-8 sm:h-12 md:h-16 block"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 L1440,0 L1440,40 C1340,40 1260,0 1140,0 C1000,0 940,50 720,50 C500,50 440,0 300,0 C180,0 100,40 0,40 Z"
            fill="#FAF7EE"
          />
        </svg>
      </div>
    </section>
  )
}
