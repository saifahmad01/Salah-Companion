import React from 'react'
import { useNavigate } from 'react-router-dom'
import { X, CheckCircle2, ArrowRight, Clock, BookOpen, BarChart3, Info } from 'lucide-react'

export type PreviewModalType = 'tracker' | 'hadith' | 'progress' | 'about' | null

interface FeaturePreviewModalProps {
  type: PreviewModalType
  onClose: () => void
}

export const FeaturePreviewModal: React.FC<FeaturePreviewModalProps> = ({ type, onClose }) => {
  const navigate = useNavigate()
  if (!type) return null

  const getDetails = () => {
    switch (type) {
      case 'tracker':
        return {
          icon: <Clock className="w-8 h-8 text-amber-400" />,
          title: 'Track Your Five Daily Prayers',
          subtitle: 'Never miss a Salah with real-time astronomical prayer times and habit accountability.',
          bullets: [
            'Accurate local prayer calculation based on your GPS coordinates & juristic madhab (Hanafi / Shafi‘i).',
            'Live countdown to next prayer window with visual progress bar.',
            'Track on-time, late, and missed prayers with private daily logs synced securely to your account.',
            'Gentle notifications and reminders tailored to your daily schedule.',
          ],
          cta: 'Start Tracking Free',
        }
      case 'hadith':
        return {
          icon: <BookOpen className="w-8 h-8 text-amber-400" />,
          title: 'Daily Authentic Hadith',
          subtitle: 'Enrich your mind and strengthen your Iman with authentic Prophetic traditions.',
          bullets: [
            'Verified Hadith collections from Sahih Bukhari, Sahih Muslim, and classical works.',
            'Multilingual translations: Arabic text, English translation, and Roman Hindi/Urdu transliteration.',
            'Contextual wisdom for prayer habits, patience, gratitude, and spiritual mindfulness.',
            'Save favorite Hadith to your personal library for reflection anytime.',
          ],
          cta: 'Explore Daily Hadith',
        }
      case 'progress':
        return {
          icon: <BarChart3 className="w-8 h-8 text-amber-400" />,
          title: 'Monitor Your Spiritual Progress',
          subtitle: 'View your consistency over time and celebrate steady spiritual growth.',
          bullets: [
            'Weekly & monthly Salah consistency metrics with streak trackers.',
            'Track daily Islamic deeds: Quran reading, Istighfar, Adhkar, and helping others.',
            'Actionable insights to turn prayer into an unwavering daily habit.',
            'Completely private & secure data — only you have access to your personal journey.',
          ],
          cta: 'Track Your Progress',
        }
      case 'about':
      default:
        return {
          icon: <Info className="w-8 h-8 text-amber-400" />,
          title: 'About Salah Companion',
          subtitle: 'A modern, beautiful, and authentic spiritual companion for Muslims worldwide.',
          bullets: [
            'Crafted with reverence for Islamic tradition and modern frontend engineering excellence.',
            'Verified astronomical prayer calculation engines with multi-method juristic support.',
            'Official Hadith API integration with cross-verified source grades.',
            'Free and privacy-focused: no ads, no trackers, no clutter.',
          ],
          cta: 'Join Salah Companion',
        }
    }
  }

  const details = getDetails()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#FAF7EE] rounded-3xl border border-[#E4D9C7] shadow-2xl overflow-hidden animate-slide-up text-[#122A1F]">
        {/* Header Banner */}
        <div className="relative bg-[#092B20] text-white p-6 sm:p-7">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-2xl bg-white/10 border border-emerald-500/20 shadow-xs">
              {details.icon}
            </div>
            <span className="text-xs font-semibold tracking-wider text-amber-300 uppercase">
              Salah Companion Feature
            </span>
          </div>

          <h3 className="font-serif font-bold text-2xl text-white tracking-tight">{details.title}</h3>
          <p className="mt-2 text-xs sm:text-sm text-emerald-100/80 leading-relaxed font-sans">{details.subtitle}</p>
        </div>

        {/* Body content */}
        <div className="p-6 sm:p-7 space-y-4">
          <div className="space-y-3">
            {details.bullets.map((bullet, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[#4A5D54] leading-relaxed">{bullet}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#E7DDCC] flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/login')
              }}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-[#14291F] text-sm bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{details.cta}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/login')
              }}
              className="py-3 px-5 rounded-xl font-semibold text-[#14291F] text-sm border border-[#D5C9B5] hover:bg-[#F2ECE0] cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
