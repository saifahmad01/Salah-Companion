import React from 'react'

export const TasbihIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-emerald-600' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 16 C4.5 13.5 4.5 9.5 7 7 C9.5 4.5 13.5 4.5 16 7 C18.5 9.5 18.5 13.5 16 16 C14 18 11.5 18.5 9.5 17.5" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    <circle cx="12" cy="6" r="1.2" fill="currentColor" />
    <circle cx="16" cy="8" r="1.2" fill="currentColor" />
    <circle cx="17.5" cy="12" r="1.2" fill="currentColor" />
    <circle cx="16" cy="16" r="1.2" fill="currentColor" />
    <circle cx="12" cy="17.5" r="1.2" fill="currentColor" />
    <circle cx="8" cy="16" r="1.2" fill="currentColor" />
    <circle cx="6.5" cy="12" r="1.2" fill="currentColor" />
    {/* Knot and tassel */}
    <path d="M7 16 L5 18.5 M5 18.5 L3.5 21 M5 18.5 L5 21.5 M5 18.5 L6.5 21" strokeWidth="2" />
  </svg>
)

export const HandsPrayingIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-stone-500' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7.5 18.5 L6 13 C5.5 11 6.5 8.5 8.5 7 C10 6 11 6.8 11.5 8.5 L12 13" />
    <path d="M16.5 18.5 L18 13 C18.5 11 17.5 8.5 15.5 7 C14 6 13 6.8 12.5 8.5 L12 13" />
    <path d="M9 19 C10 20.5 14 20.5 15 19" />
    <path d="M9 11 L10 11 M14 11 L15 11" />
  </svg>
)

export const BookBrownIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-[#8E5B36]' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" fill="#9C6B48" fillOpacity="0.2" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" fill="#9C6B48" fillOpacity="0.2" />
  </svg>
)

export const ClipboardBrownIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-[#8E5B36]' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" fill="#9C6B48" fillOpacity="0.25" />
    <path d="m9 14 2 2 4-4" />
  </svg>
)

export const GraduationBrownIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-[#8E5B36]' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" fill="#9C6B48" fillOpacity="0.25" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
)

export const IslamicSunsetIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-orange-500' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 18a5 5 0 0 0-10 0" stroke="currentColor" strokeWidth="2" />
    <line x1="12" y1="9" x2="12" y2="2" />
    <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
    <line x1="1" y1="18" x2="23" y2="18" strokeWidth="2" />
    <line x1="19.78" y1="11.64" x2="18.36" y2="10.22" />
    <line x1="23" y1="22" x2="1" y2="22" strokeWidth="1.5" />
  </svg>
)
