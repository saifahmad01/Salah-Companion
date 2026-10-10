import React from 'react'
import { BookOpen, Sun, Heart, Users, Check } from 'lucide-react'
import { ClipboardBrownIcon, TasbihIcon, IslamicSunsetIcon } from './CustomIcons'
import type { DeedItem } from '../types'

interface TodaysDeedsProps {
  deeds: DeedItem[]
  onToggleDeed: (id: string) => void
}

export const TodaysDeeds: React.FC<TodaysDeedsProps> = ({ deeds, onToggleDeed }) => {
  const completedCount = deeds.filter((d) => d.completed).length

  const renderDeedIcon = (type: DeedItem['iconType']) => {
    switch (type) {
      case 'quran':
        return <BookOpen className="w-4.5 h-4.5 text-[#0D9488] stroke-[2]" />
      case 'tasbih':
        return <TasbihIcon className="w-4.5 h-4.5 text-[#059669]" />
      case 'adhkar-morning':
        return <Sun className="w-4.5 h-4.5 text-[#F59E0B] stroke-[2]" />
      case 'help':
        return <Users className="w-4.5 h-4.5 text-[#0F766E] stroke-[2]" />
      case 'adhkar-evening':
        return <IslamicSunsetIcon className="w-4.5 h-4.5 text-[#EA580C]" />
      case 'parents':
        return <Heart className="w-4.5 h-4.5 text-[#059669] stroke-[2]" />
      default:
        return <Check className="w-4.5 h-4.5 text-emerald-600" />
    }
  }

  return (
    <section className="px-5 sm:px-6 lg:px-0 mt-4 lg:mt-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <ClipboardBrownIcon className="w-4.5 h-4.5 text-[#8E5B36]" />
          <h2 className="text-[13px] font-bold tracking-wider text-[#1C2C24] uppercase">
            TODAY'S DEEDS
          </h2>
        </div>
        <div className="text-[12px] text-[#63746B]">
          <span className="font-semibold text-[#182821]">{completedCount}</span> / 5 completed
        </div>
      </div>

      {/* 2-column grid of 6 deeds */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        {deeds.map((deed) => {
          const isDone = deed.completed
          return (
            <button
              key={deed.id}
              type="button"
              onClick={() => onToggleDeed(deed.id)}
              className={`flex items-center justify-between p-2.5 sm:p-3 rounded-[14px] sm:rounded-[16px] transition-all duration-150 select-none cursor-pointer active:scale-[0.98] ${
                isDone
                  ? 'bg-[#F2F8F4] border border-[#CEE5D8] shadow-xs'
                  : 'bg-white border border-[#ECE8DC] shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-emerald-300'
              }`}
            >
              {/* Left: Icon and Title */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex-shrink-0 flex items-center justify-center">
                  {renderDeedIcon(deed.iconType)}
                </div>
                <span
                  className={`text-[12.5px] font-medium leading-tight truncate ${
                    isDone ? 'text-[#0E543F] font-semibold' : 'text-[#1B2922]'
                  }`}
                >
                  {deed.title}
                </span>
              </div>

              {/* Right: Rounded Checkbox */}
              <div
                className={`w-4 h-4 rounded-[4px] flex items-center justify-center flex-shrink-0 ml-1.5 transition-colors ${
                  isDone
                    ? 'bg-[#0C4535] border border-[#0C4535] text-white'
                    : 'border border-[#CBD5E1] bg-white'
                }`}
              >
                {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
