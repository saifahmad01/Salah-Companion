import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, ArrowRight, Menu, X } from 'lucide-react'

interface LandingNavbarProps {
  onOpenModal?: (type: 'hadith' | 'tracker' | 'about') => void
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onOpenModal }) => {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<'home' | 'features' | 'hadith' | 'tracker' | 'about'>('home')

  const scrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault()
    setActiveNav('features')
    setMobileMenuOpen(false)
    const el = document.getElementById('features')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleNavClick = (tab: 'home' | 'features' | 'hadith' | 'tracker' | 'about', e: React.MouseEvent) => {
    e.preventDefault()
    setActiveNav(tab)
    setMobileMenuOpen(false)
    if (tab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (tab === 'features') {
      scrollToFeatures(e)
    } else if (onOpenModal) {
      onOpenModal(tab as 'hadith' | 'tracker' | 'about')
    }
  }

  return (
    <header className="relative z-30 w-full pt-0 sm:pt-2 px-0 sm:px-4 md:px-8">
      {/* Curved Architectural Navbar Container */}
      <div className="relative mx-auto max-w-7xl bg-[#FAF7EE] shadow-[0_4px_24px_rgba(0,0,0,0.08)] sm:rounded-b-[28px] md:rounded-b-[36px] border-b sm:border-x border-[#E9E2D2] transition-all">
        <div className="px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Left: Brand Identity */}
          <Link
            to="/"
            onClick={() => {
              setActiveNav('home')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-emerald-900/10 flex items-center justify-center bg-[#0C4535]">
              <img
                src="/images/app-logo.png"
                alt="Salah Companion Logo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl md:text-[22px] tracking-tight text-[#12291F] leading-tight">
                Salah Companion
              </span>
              <span className="text-[10px] md:text-[11px] font-sans font-medium text-[#6B7D74] tracking-wider">
                Salah Today &bull; A Better Tomorrow
              </span>
            </div>
          </Link>

          {/* Middle: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-[#1E3127]">
            <a
              href="#home"
              onClick={(e) => handleNavClick('home', e)}
              className="relative py-2 transition-colors hover:text-[#0C4535]"
            >
              <span>Home</span>
              {activeNav === 'home' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#C59B4B] rounded-full" />
              )}
            </a>
            <a
              href="#features"
              onClick={scrollToFeatures}
              className="relative py-2 transition-colors hover:text-[#0C4535]"
            >
              <span>Features</span>
              {activeNav === 'features' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#C59B4B] rounded-full" />
              )}
            </a>
            <a
              href="#hadith"
              onClick={(e) => handleNavClick('hadith', e)}
              className="relative py-2 transition-colors hover:text-[#0C4535]"
            >
              <span>Daily Hadith</span>
              {activeNav === 'hadith' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#C59B4B] rounded-full" />
              )}
            </a>
            <a
              href="#tracker"
              onClick={(e) => handleNavClick('tracker', e)}
              className="relative py-2 transition-colors hover:text-[#0C4535]"
            >
              <span>Prayer Tracker</span>
              {activeNav === 'tracker' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#C59B4B] rounded-full" />
              )}
            </a>
            <a
              href="#about"
              onClick={(e) => handleNavClick('about', e)}
              className="relative py-2 transition-colors hover:text-[#0C4535]"
            >
              <span>About</span>
              {activeNav === 'about' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#C59B4B] rounded-full" />
              )}
            </a>
          </nav>

          {/* Right: Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#1B2F25] border border-[#DDD3C1] hover:bg-[#F2ECE0] transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 text-[#1B2F25]" />
              <span>Login</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#0C3E30] hover:bg-[#093226] shadow-sm transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="p-2 text-[#1B2F25] hover:bg-stone-200/50 rounded-lg cursor-pointer"
              title="Login"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#1B2F25] hover:bg-stone-200/50 rounded-lg focus:outline-none cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden px-6 pt-2 pb-6 border-t border-[#E9E2D2] flex flex-col gap-3 animate-fade-in">
            <a
              href="#home"
              onClick={(e) => handleNavClick('home', e)}
              className="py-2 text-base font-semibold text-[#1E3127] hover:text-[#0C4535]"
            >
              Home
            </a>
            <a
              href="#features"
              onClick={scrollToFeatures}
              className="py-2 text-base font-semibold text-[#1E3127] hover:text-[#0C4535]"
            >
              Features
            </a>
            <a
              href="#hadith"
              onClick={(e) => handleNavClick('hadith', e)}
              className="py-2 text-base font-semibold text-[#1E3127] hover:text-[#0C4535]"
            >
              Daily Hadith
            </a>
            <a
              href="#tracker"
              onClick={(e) => handleNavClick('tracker', e)}
              className="py-2 text-base font-semibold text-[#1E3127] hover:text-[#0C4535]"
            >
              Prayer Tracker
            </a>
            <a
              href="#about"
              onClick={(e) => handleNavClick('about', e)}
              className="py-2 text-base font-semibold text-[#1E3127] hover:text-[#0C4535]"
            >
              About
            </a>

            <div className="pt-3 border-t border-[#E9E2D2] flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/login')
                }}
                className="w-full py-2.5 rounded-xl text-center text-sm font-semibold text-[#1B2F25] border border-[#DDD3C1] hover:bg-[#F2ECE0] flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>Login</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/register')
                }}
                className="w-full py-2.5 rounded-xl text-center text-sm font-semibold text-white bg-[#0C3E30] hover:bg-[#093226] flex items-center justify-center gap-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
