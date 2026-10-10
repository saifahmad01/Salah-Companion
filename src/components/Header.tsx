import React from 'react'
import { Bell, User, Calendar, Moon, Wifi, MapPin, ChevronDown } from 'lucide-react'

interface HeaderProps {
  currentTimeStr: string
  cityName: string
  gregorianDateStr: string
  hijriDateStr: string
  isGPS?: boolean
  coords?: { lat: number; lng: number }
  userName?: string
  unreadCount?: number
  onOpenNotifications?: () => void
  onOpenProfile?: () => void
  onOpenLocation?: () => void
  onOpenEnglishCalendar?: () => void
  onOpenArabicCalendar?: () => void
}

export const Header: React.FC<HeaderProps> = ({
  currentTimeStr,
  cityName,
  gregorianDateStr,
  hijriDateStr,
  isGPS,
  coords,
  userName,
  unreadCount = 0,
  onOpenNotifications,
  onOpenProfile,
  onOpenLocation,
  onOpenEnglishCalendar,
  onOpenArabicCalendar,
}) => {
  return (
    <header className="relative w-full overflow-hidden select-none">
      {/* iOS Status Bar - Connected to Real Time of India (Hidden on tablet/laptop/desktop) */}
      <div className="flex sm:hidden items-center justify-between px-7 pt-3 pb-2 text-[#0F1D16] text-[14px] font-semibold tracking-tight">
        <span className="font-semibold">{currentTimeStr}</span>
        <div className="flex items-center gap-1.5 text-[#0F1D16]">
          {/* Cellular signal 4 bars */}
          <div className="flex items-end gap-[1.5px] h-3 mr-0.5">
            <span className="w-[3px] h-1.5 bg-current rounded-sm"></span>
            <span className="w-[3px] h-2 bg-current rounded-sm"></span>
            <span className="w-[3px] h-2.5 bg-current rounded-sm"></span>
            <span className="w-[3px] h-3 bg-current rounded-sm"></span>
          </div>
          {/* Wi-Fi Icon */}
          <Wifi className="w-[15px] h-[15px] stroke-[2.4]" />
          {/* Battery Icon */}
          <div className="flex items-center">
            <div className="w-[22px] h-[11px] border-[1.5px] border-current rounded-[3.5px] p-[1.5px] flex items-center">
              <div className="w-[15px] h-full bg-current rounded-[1.5px]"></div>
            </div>
            <div className="w-[1.5px] h-[4px] bg-current rounded-r-[1px] ml-[0.5px]"></div>
          </div>
        </div>
      </div>

      {/* App Bar (Logo, Title, Location Badge, Actions) */}
      <div className="flex items-center justify-between px-5 sm:px-6 lg:px-8 pt-3 pb-2.5">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shadow-sm border border-emerald-900/10 flex-shrink-0 bg-[#0E3D2E]">
            <img
              src="/images/app-logo.png"
              alt="Salah Companion Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] sm:text-[19px] font-bold text-[#14261E] leading-tight tracking-tight">
                Salah Companion
              </h1>
            </div>
            {/* Location indicator button on top */}
            <button
              type="button"
              onClick={onOpenLocation}
              className="flex items-center gap-1.5 text-[#0C4535] hover:text-[#062920] transition mt-0.5 group cursor-pointer text-left"
              title={
                isGPS && coords
                  ? `Live GPS: ${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E - Click to change`
                  : 'Click to change location or use GPS'
              }
            >
              <div className="flex items-center gap-1 min-w-0">
                {isGPS ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-[#0E543F] text-[9.5px] font-bold tracking-wider flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    GPS
                  </span>
                ) : (
                  <MapPin className="w-3 h-3 text-[#0E543F] flex-shrink-0" />
                )}
                <span className="text-[11.5px] sm:text-xs font-semibold text-[#0E543F] group-hover:underline truncate max-w-[170px] sm:max-w-[280px] lg:max-w-[380px]">
                  {cityName.includes('India') ? cityName : `${cityName}, India`}
                </span>
              </div>
              <ChevronDown className="w-2.5 h-2.5 text-[#0E543F] flex-shrink-0" />
            </button>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Button with Unread Badge */}
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Notifications"
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white border border-[#E5E2D9] shadow-sm flex items-center justify-center text-[#1C2C24] transition-transform active:scale-95 cursor-pointer"
          >
            <Bell className="w-[18px] h-[18px] stroke-[1.8]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Profile User Button */}
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Profile"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white border border-[#E5E2D9] shadow-sm flex items-center justify-center text-[#1C2C24] transition-transform active:scale-95 overflow-hidden cursor-pointer"
          >
            {userName ? (
              <span className="w-full h-full bg-[#0C4535] text-white text-[12px] sm:text-sm font-bold flex items-center justify-center">
                {userName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="w-[18px] h-[18px] stroke-[1.8]" />
            )}
          </button>
        </div>
      </div>

      {/* Greeting and Landscape Banner Section */}
      <div className="relative px-5 sm:px-6 lg:px-8 pt-2 pb-3.5">
        {/* Scenic Mosque Artwork in top right */}
        <div className="absolute right-0 top-[-10px] w-[58%] sm:w-[44%] lg:w-[36%] h-[155px] sm:h-[175px] lg:h-[195px] pointer-events-none overflow-hidden">
          <img
            src="/images/mosque-clean.png"
            alt="Scenic Mosque"
            className="w-full h-full object-cover object-left opacity-95"
          />
          {/* Soft gradient masks to blend cleanly with cream background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F8F6F0] via-[#F8F6F0]/40 to-transparent w-2/5"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#F8F6F0] via-transparent to-transparent h-full"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#F8F6F0]/30 via-transparent to-transparent h-1/4"></div>
        </div>

        {/* Greeting Text and Dates on left */}
        <div className="relative z-10 max-w-[65%] sm:max-w-md lg:max-w-xl">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[23px] sm:text-[26px] font-bold text-[#11241C] tracking-tight leading-snug">
              Assalamu Alaikum
            </h2>
            <span className="text-[20px] sm:text-[22px] select-none" role="img" aria-label="Waving hand">
              👋
            </span>
          </div>
          <p className="text-[13.5px] sm:text-sm text-[#55665D] font-normal mt-0.5 mb-2 leading-snug">
            May Allah bless your day.
          </p>

          <div className="space-y-1.5 sm:space-y-0 sm:flex sm:items-center sm:gap-4 mt-1 text-[12px] sm:text-[12.5px] font-medium text-[#304037]">
            {/* English / Gregorian Calendar Trigger */}
            <button
              type="button"
              onClick={onOpenEnglishCalendar}
              className="flex items-center gap-2 hover:text-[#0C4535] group cursor-pointer transition text-left"
              title="Click to open English/Gregorian Islamic Calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-[#5C6D64] group-hover:text-[#0C4535] stroke-[1.9] flex-shrink-0" />
              <span className="group-hover:underline underline-offset-2">{gregorianDateStr}</span>
            </button>

            {/* Arabic / Hijri Calendar Trigger */}
            <button
              type="button"
              onClick={onOpenArabicCalendar}
              className="flex items-center gap-2 hover:text-[#0C4535] group cursor-pointer transition text-left"
              title="Click to open Arabic/Hijri Islamic Calendar"
            >
              <Moon className="w-3.5 h-3.5 text-[#5C6D64] group-hover:text-[#0C4535] stroke-[1.9] flex-shrink-0" />
              <span className="group-hover:underline underline-offset-2">{hijriDateStr}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
