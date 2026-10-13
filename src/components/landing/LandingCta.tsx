import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export const LandingCta: React.FC = () => {
  const navigate = useNavigate()

  return (
    <section className="relative w-full overflow-hidden min-h-[300px] sm:min-h-[360px] flex items-center justify-center py-12 sm:py-16">
      {/* Background with Sheikh Zayed Mosque Courtyard, Lantern Glow & Rehal Quran Stand */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/landing_hero_bg.jpg"
          alt="Quran on wooden stand and mosque arches"
          className="w-full h-full object-cover object-bottom"
        />
        {/* Emerald Architectural Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#08291F]/90 via-[#062017]/90 to-[#041610]/95" />
      </div>

      {/* Centered CTA Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="font-serif font-bold text-white text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight">
          Small Steps. Consistent Salah. Stronger Iman.
        </h2>

        <p className="mt-2.5 sm:mt-3 text-sm sm:text-base text-[#CCDCD3] font-sans max-w-xl mx-auto font-normal">
          Start your journey today and take one step closer to a more fulfilling and meaningful life.
        </p>

        <div className="mt-6 sm:mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2.5 px-8 sm:px-9 py-3.5 rounded-full font-bold text-[#14291F] text-sm sm:text-base bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-[0_4px_24px_rgba(212,175,55,0.3)] transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <span>Start Your Journey</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
