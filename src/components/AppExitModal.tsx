import React from 'react'
import { HeartHandshake, ShieldCheck, X } from 'lucide-react'

interface AppExitModalProps {
  isOpen: boolean
  onStay: () => void
  onExit: () => void
}

export const AppExitModal: React.FC<AppExitModalProps> = ({
  isOpen,
  onStay,
  onExit,
}) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans"
      onClick={onStay}
    >
      <div
        className="w-full max-w-md bg-[#FAF7EE] rounded-3xl p-6 sm:p-7 border border-[#E4D9C7] shadow-2xl text-[#132A1F] relative space-y-5 animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top close button (acts as Stay in App) */}
        <button
          type="button"
          onClick={onStay}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#EAE2D0] hover:bg-[#DCD0BB] flex items-center justify-center text-[#5D6F66] hover:text-[#122A20] transition cursor-pointer"
          aria-label="Close dialog and stay in app"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Islamic Header Emblem */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-[#0C4535] border border-amber-400/40 shadow-lg flex items-center justify-center text-amber-300">
            <HeartHandshake className="w-8 h-8" />
          </div>

          <p className="text-xs font-serif text-[#B58728] tracking-widest uppercase">
            فِي أَمَانِ اللَّهِ • Fi Amanillah
          </p>

          <h3 id="exit-modal-title" className="font-serif font-bold text-xl sm:text-2xl text-[#122A20]">
            Are you sure you want to exit?
          </h3>

          <p className="text-xs text-[#5D6F66] leading-relaxed max-w-xs">
            May Allah preserve your Salah and keep your heart steadfast upon the Deen.
          </p>
        </div>

        {/* Authentic Leaving Du'a Card */}
        <div className="p-3.5 bg-[#0C4535]/8 rounded-2xl border border-[#0C4535]/15 space-y-1.5 text-center">
          <p className="text-sm sm:text-base font-serif text-[#0C4535] font-semibold leading-relaxed" dir="rtl">
            بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ
          </p>
          <p className="text-[11px] text-[#5D6F66] italic leading-tight">
            "In the name of Allah, I place my trust in Allah, and there is no might nor power except with Allah."
          </p>
          <span className="text-[9px] text-[#B58728] font-medium block">
            Sunan Abi Dawud 5095
          </span>
        </div>

        {/* Session Preservation Assurance Notice */}
        <div className="flex items-start gap-2.5 p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 text-left">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Session &amp; records safe:</strong> Exiting will <strong>not</strong> log you out. Your prayer records remain saved and you will stay signed in when you return.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onStay}
            className="py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#0C4535] hover:bg-[#0A3B2D] text-amber-300 border border-amber-400/40 shadow-md hover:shadow-lg transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Stay in App</span>
            <span className="text-[10px] text-amber-200/80 font-normal">استمرار</span>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-[#EAE2D0] hover:bg-[#DFD5BE] text-[#122A20] border border-[#D5C9B5] transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Exit App</span>
            <span className="text-[10px] text-[#5D6F66] font-normal">خروج</span>
          </button>
        </div>
      </div>
    </div>
  )
}
