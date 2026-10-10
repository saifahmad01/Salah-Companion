import React from 'react'
import { Home, Moon, BookOpen, BarChart2, Settings } from 'lucide-react'

export type NavTab = 'home' | 'salah' | 'quran' | 'progress' | 'settings'

interface BottomNavProps {
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 max-w-[440px] mx-auto bg-white/95 backdrop-blur-md border-t border-[#EBE7DC] px-3 pt-2 pb-1.5 z-40 select-none shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-around">
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => onTabChange('home')}
          className="flex flex-col items-center justify-center py-1 px-2.5 transition-colors group cursor-pointer"
        >
          <div className="h-6 flex items-center justify-center">
            <Home
              className={`w-5 h-5 ${
                activeTab === 'home'
                  ? 'text-[#0C4535] fill-[#0C4535]'
                  : 'text-[#62736A] group-hover:text-[#0C4535]'
              }`}
            />
          </div>
          <span
            className={`text-[11px] mt-0.5 leading-tight ${
              activeTab === 'home'
                ? 'font-bold text-[#0C4535]'
                : 'font-medium text-[#62736A] group-hover:text-[#0C4535]'
            }`}
          >
            Home
          </span>
        </button>

        {/* 2. Salah */}
        <button
          type="button"
          onClick={() => onTabChange('salah')}
          className="flex flex-col items-center justify-center py-1 px-2.5 transition-colors group cursor-pointer"
        >
          <div className="h-6 flex items-center justify-center">
            <Moon
              className={`w-5 h-5 ${
                activeTab === 'salah'
                  ? 'text-[#0C4535] stroke-[2.3]'
                  : 'text-[#62736A] stroke-[1.8] group-hover:text-[#0C4535]'
              }`}
            />
          </div>
          <span
            className={`text-[11px] mt-0.5 leading-tight ${
              activeTab === 'salah'
                ? 'font-bold text-[#0C4535]'
                : 'font-medium text-[#62736A] group-hover:text-[#0C4535]'
            }`}
          >
            Salah
          </span>
        </button>

        {/* 3. Quran */}
        <button
          type="button"
          onClick={() => onTabChange('quran')}
          className="flex flex-col items-center justify-center py-1 px-2.5 transition-colors group cursor-pointer"
        >
          <div className="h-6 flex items-center justify-center">
            <BookOpen
              className={`w-5 h-5 ${
                activeTab === 'quran'
                  ? 'text-[#0C4535] stroke-[2.3]'
                  : 'text-[#62736A] stroke-[1.8] group-hover:text-[#0C4535]'
              }`}
            />
          </div>
          <span
            className={`text-[11px] mt-0.5 leading-tight ${
              activeTab === 'quran'
                ? 'font-bold text-[#0C4535]'
                : 'font-medium text-[#62736A] group-hover:text-[#0C4535]'
            }`}
          >
            Quran
          </span>
        </button>

        {/* 4. Progress */}
        <button
          type="button"
          onClick={() => onTabChange('progress')}
          className="flex flex-col items-center justify-center py-1 px-2.5 transition-colors group cursor-pointer"
        >
          <div className="h-6 flex items-center justify-center">
            <BarChart2
              className={`w-5 h-5 ${
                activeTab === 'progress'
                  ? 'text-[#0C4535] stroke-[2.4]'
                  : 'text-[#62736A] stroke-[1.8] group-hover:text-[#0C4535]'
              }`}
            />
          </div>
          <span
            className={`text-[11px] mt-0.5 leading-tight ${
              activeTab === 'progress'
                ? 'font-bold text-[#0C4535]'
                : 'font-medium text-[#62736A] group-hover:text-[#0C4535]'
            }`}
          >
            Progress
          </span>
        </button>

        {/* 5. Settings */}
        <button
          type="button"
          onClick={() => onTabChange('settings')}
          className="flex flex-col items-center justify-center py-1 px-2.5 transition-colors group cursor-pointer"
        >
          <div className="h-6 flex items-center justify-center">
            <Settings
              className={`w-5 h-5 ${
                activeTab === 'settings'
                  ? 'text-[#0C4535] stroke-[2.3]'
                  : 'text-[#62736A] stroke-[1.8] group-hover:text-[#0C4535]'
              }`}
            />
          </div>
          <span
            className={`text-[11px] mt-0.5 leading-tight ${
              activeTab === 'settings'
                ? 'font-bold text-[#0C4535]'
                : 'font-medium text-[#62736A] group-hover:text-[#0C4535]'
            }`}
          >
            Settings
          </span>
        </button>
      </div>

      {/* iOS Home Indicator Pill */}
      <div className="pt-2 pb-1 flex justify-center">
        <div className="w-32 h-1 bg-black/85 rounded-full"></div>
      </div>
    </nav>
  )
}
