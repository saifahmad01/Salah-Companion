import React, { useState } from 'react'
import { LandingNavbar } from '../components/landing/LandingNavbar'
import { LandingHero } from '../components/landing/LandingHero'
import { LandingFeatures } from '../components/landing/LandingFeatures'
import { LandingCta } from '../components/landing/LandingCta'
import { FeaturePreviewModal, type PreviewModalType } from '../components/landing/FeaturePreviewModal'
import { useAuth } from '../context/AuthContext'

export const LandingPage: React.FC = () => {
  const [activeModal, setActiveModal] = useState<PreviewModalType>(null)
  const { banner, setBanner } = useAuth()

  return (
    <div className="min-h-screen bg-[#07241A] flex flex-col justify-between selection:bg-amber-300 selection:text-emerald-950 font-sans antialiased text-[#1E2923]">
      {/* Global verification or OAuth notification banner */}
      {banner && (
        <div
          className={`sticky top-0 z-50 px-4 py-3 text-xs sm:text-sm font-semibold flex items-center justify-between border-b transition-all duration-300 shadow-md ${
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

      {/* Main Page Layout reproducing the Reference Image */}
      <div className="w-full flex flex-col flex-1">
        {/* Top Navbar */}
        <LandingNavbar onOpenModal={(type) => setActiveModal(type)} />

        {/* Hero Section */}
        <LandingHero />

        {/* Middle Features Section */}
        <LandingFeatures onCardClick={(feature) => setActiveModal(feature)} />

        {/* Bottom CTA Section */}
        <LandingCta />
      </div>

      {/* Interactive Feature Previews */}
      <FeaturePreviewModal type={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  )
}

export default LandingPage
