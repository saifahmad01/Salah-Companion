import React from 'react'
import { Clock, BarChart2, ArrowRight } from 'lucide-react'
import { GraduationBrownIcon } from './CustomIcons'

interface StrengthenImanProps {
  onLearnClick: () => void
}

export const StrengthenIman: React.FC<StrengthenImanProps> = ({ onLearnClick }) => {
  return (
    <section className="px-5 sm:px-6 lg:px-0 mt-4 lg:mt-0 mb-20 md:mb-6 lg:mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <GraduationBrownIcon className="w-4.5 h-4.5 text-[#8E5B36]" />
          <h2 className="text-[13px] font-bold tracking-wider text-[#1C2C24] uppercase">
            STRENGTHEN YOUR IMAN
          </h2>
        </div>
        <span className="text-[11.5px] text-[#697970] font-normal">
          Today's Lesson
        </span>
      </div>

      {/* Lesson Card */}
      <div className="w-full rounded-[20px] bg-white border border-[#ECE7DC] p-2.5 sm:p-3.5 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        {/* Left Thumbnail */}
        <div className="w-[98px] sm:w-[110px] h-[64px] sm:h-[72px] rounded-[12px] overflow-hidden flex-shrink-0 bg-stone-100">
          <img
            src="/images/sabr-clean.png"
            alt="The Power of Sabr"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Middle Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[13.5px] font-bold text-[#16251E] leading-tight truncate">
            The Power of Sabr
          </h3>
          <p className="text-[11px] leading-[1.3] text-[#63736A] mt-0.5 line-clamp-2">
            Learn how patience can transform your relationship with Allah.
          </p>

          {/* Metadata badges */}
          <div className="flex items-center gap-3 mt-1.5 text-[10.5px] text-[#6E7F76]">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 stroke-[2]" />
              <span>2 min read</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart2 className="w-3 h-3 stroke-[2]" />
              <span>Beginner</span>
            </div>
          </div>
        </div>

        {/* Right Learn Button */}
        <button
          type="button"
          onClick={onLearnClick}
          className="flex-shrink-0 bg-[#0C4535] hover:bg-[#083327] active:scale-95 text-white px-3.5 py-1.5 rounded-xl font-medium text-[12px] flex items-center gap-1 transition shadow-xs"
        >
          <span>Learn</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>
      </div>
    </section>
  )
}
