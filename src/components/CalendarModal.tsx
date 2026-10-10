import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Moon,
  Check,
} from 'lucide-react'
import {
  ISLAMIC_MONTHS,
  getHijriFromGregorian,
  hijriToJulianDay,
  julianDayToGregorian,
  getDaysInHijriMonth,
} from '../utils/islamicCalendar'

export type CalendarMode = 'gregorian' | 'hijri'

interface CalendarModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: CalendarMode
  onSelectDate?: (date: Date) => void
  activeDate?: Date
}

const GREGORIAN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const GREGORIAN_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Extended past, present, and future years coverage
const GREGORIAN_YEARS = Array.from({ length: 111 }, (_, i) => 1950 + i)
const HIJRI_YEARS = Array.from({ length: 113 }, (_, i) => 1370 + i)

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'gregorian',
  onSelectDate,
  activeDate,
}) => {
  const [mode, setMode] = useState<CalendarMode>(initialMode)

  // Reference date (defaults to activeDate or current date)
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => activeDate || new Date())

  // Current day reference (today)
  const today = useMemo(() => activeDate || new Date(), [activeDate])
  const todayHijri = useMemo(() => getHijriFromGregorian(today), [today])

  // Hijri representation of selectedDate (if a date is selected)
  const selectedHijri = useMemo(() => {
    return selectedDate ? getHijriFromGregorian(selectedDate) : null
  }, [selectedDate])

  // Helpers to check if navigated month/year is the current month/year
  const isCurrentGregMonth = (y: number, m: number) => {
    return y === today.getFullYear() && m === today.getMonth()
  }

  const isCurrentHijriMonth = (y: number, m: number) => {
    return y === todayHijri.year && m === todayHijri.month
  }

  // Navigation state for Gregorian calendar
  const [gregYear, setGregYear] = useState(() => (activeDate || new Date()).getFullYear())
  const [gregMonth, setGregMonth] = useState(() => (activeDate || new Date()).getMonth()) // 0-indexed

  // Navigation state for Hijri calendar
  const [hijriYear, setHijriYear] = useState(() => todayHijri.year)
  const [hijriMonth, setHijriMonth] = useState(() => todayHijri.month) // 1-indexed

  // Dropdown month/year picker state
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  // Track initialization to ONLY run once when modal transitions from closed to open
  // This prevents the 1-second ticking clock from resetting the user's month/year navigation!
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (isOpen && !isInitializedRef.current) {
      setMode(initialMode)
      const baseDate = activeDate || new Date()
      setSelectedDate(baseDate)
      setGregYear(baseDate.getFullYear())
      setGregMonth(baseDate.getMonth())

      const hijri = getHijriFromGregorian(baseDate)
      setHijriYear(hijri.year)
      setHijriMonth(hijri.month)
      setIsPickerOpen(false)
      isInitializedRef.current = true
    } else if (!isOpen) {
      isInitializedRef.current = false
      setIsPickerOpen(false)
    }
  }, [isOpen, initialMode])

  // Month navigation handlers (Arrow buttons < and >)
  const handlePrevMonth = () => {
    if (mode === 'gregorian') {
      const newYear = gregMonth === 0 ? gregYear - 1 : gregYear
      const newMonth = gregMonth === 0 ? 11 : gregMonth - 1
      setGregYear(newYear)
      setGregMonth(newMonth)

      // Only select today if returning to the current month; otherwise clean (not selected)
      if (isCurrentGregMonth(newYear, newMonth)) {
        setSelectedDate(today)
      } else {
        setSelectedDate(null)
      }
    } else {
      const newYear = hijriMonth === 1 ? hijriYear - 1 : hijriYear
      const newMonth = hijriMonth === 1 ? 12 : hijriMonth - 1
      setHijriYear(newYear)
      setHijriMonth(newMonth)

      // Only select today if returning to the current Hijri month; otherwise clean (not selected)
      if (isCurrentHijriMonth(newYear, newMonth)) {
        setSelectedDate(today)
      } else {
        setSelectedDate(null)
      }
    }
  }

  const handleNextMonth = () => {
    if (mode === 'gregorian') {
      const newYear = gregMonth === 11 ? gregYear + 1 : gregYear
      const newMonth = gregMonth === 11 ? 0 : gregMonth + 1
      setGregYear(newYear)
      setGregMonth(newMonth)

      // Only select today if returning to the current month; otherwise clean (not selected)
      if (isCurrentGregMonth(newYear, newMonth)) {
        setSelectedDate(today)
      } else {
        setSelectedDate(null)
      }
    } else {
      const newYear = hijriMonth === 12 ? hijriYear + 1 : hijriYear
      const newMonth = hijriMonth === 12 ? 1 : hijriMonth + 1
      setHijriYear(newYear)
      setHijriMonth(newMonth)

      // Only select today if returning to the current Hijri month; otherwise clean (not selected)
      if (isCurrentHijriMonth(newYear, newMonth)) {
        setSelectedDate(today)
      } else {
        setSelectedDate(null)
      }
    }
  }

  // Direct month selection from picker
  const handleSelectGregMonth = (mIdx: number) => {
    setGregMonth(mIdx)
    if (isCurrentGregMonth(gregYear, mIdx)) {
      setSelectedDate(today)
    } else {
      setSelectedDate(null)
    }
    setIsPickerOpen(false)
  }

  // Direct year selection from picker
  const handleSelectGregYear = (y: number) => {
    setGregYear(y)
    if (isCurrentGregMonth(y, gregMonth)) {
      setSelectedDate(today)
    } else {
      setSelectedDate(null)
    }
  }

  // Direct Hijri month selection from picker
  const handleSelectHijriMonth = (mIdx: number) => {
    setHijriMonth(mIdx)
    if (isCurrentHijriMonth(hijriYear, mIdx)) {
      setSelectedDate(today)
    } else {
      setSelectedDate(null)
    }
    setIsPickerOpen(false)
  }

  // Direct Hijri year selection from picker
  const handleSelectHijriYear = (y: number) => {
    setHijriYear(y)
    if (isCurrentHijriMonth(y, hijriMonth)) {
      setSelectedDate(today)
    } else {
      setSelectedDate(null)
    }
  }

  // Mode switch handler
  const handleSwitchMode = (newMode: CalendarMode) => {
    setMode(newMode)
    const refDate = selectedDate || today
    if (newMode === 'hijri') {
      const h = getHijriFromGregorian(refDate)
      setHijriYear(h.year)
      setHijriMonth(h.month)
      if (selectedDate && isCurrentHijriMonth(h.year, h.month)) {
        setSelectedDate(today)
      } else if (!selectedDate) {
        setSelectedDate(null)
      }
    } else {
      setGregYear(refDate.getFullYear())
      setGregMonth(refDate.getMonth())
      if (selectedDate && isCurrentGregMonth(refDate.getFullYear(), refDate.getMonth())) {
        setSelectedDate(today)
      } else if (!selectedDate) {
        setSelectedDate(null)
      }
    }
  }

  // Confirm selection
  const handleConfirm = () => {
    if (onSelectDate) {
      if (selectedDate) {
        onSelectDate(selectedDate)
      } else {
        if (mode === 'gregorian') {
          onSelectDate(new Date(gregYear, gregMonth, 1, 12, 0, 0))
        } else {
          const jd = hijriToJulianDay(hijriYear, hijriMonth, 1)
          onSelectDate(julianDayToGregorian(jd))
        }
      }
    }
    onClose()
  }

  // Gregorian Month Grid calculation
  const gregorianDays = useMemo(() => {
    const firstDay = new Date(gregYear, gregMonth, 1, 12, 0, 0)
    const daysInMonth = new Date(gregYear, gregMonth + 1, 0).getDate()
    const startingDayOfWeek = firstDay.getDay() // 0 = Sunday

    const prevMonthDays = new Date(gregYear, gregMonth, 0).getDate()
    const days = []

    // Previous month padding days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const date = new Date(gregYear, gregMonth - 1, d, 12, 0, 0)
      days.push({
        dayNumber: d,
        date,
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(gregYear, gregMonth, d, 12, 0, 0)
      const isSelected =
        selectedDate !== null &&
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear()

      days.push({
        dayNumber: d,
        date,
        isCurrentMonth: true,
        isSelected,
      })
    }

    // Next month padding days to complete 35 cells (or 42 if needed)
    const totalCells = days.length <= 35 ? 35 : 42
    const remaining = totalCells - days.length
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(gregYear, gregMonth + 1, d, 12, 0, 0)
      days.push({
        dayNumber: d,
        date,
        isCurrentMonth: false,
      })
    }

    return days
  }, [gregYear, gregMonth, selectedDate])

  // Hijri Month Grid calculation
  const hijriDays = useMemo(() => {
    const startJd = hijriToJulianDay(hijriYear, hijriMonth, 1)
    const startDate = julianDayToGregorian(startJd)
    const startingDayOfWeek = startDate.getDay() // 0 = Sunday
    const daysInMonth = getDaysInHijriMonth(hijriYear, hijriMonth)

    // Previous Hijri month info
    const prevHYear = hijriMonth === 1 ? hijriYear - 1 : hijriYear
    const prevHMonth = hijriMonth === 1 ? 12 : hijriMonth - 1
    const prevDaysInMonth = getDaysInHijriMonth(prevHYear, prevHMonth)

    const days = []

    // Previous month padding days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevDaysInMonth - i
      const jd = hijriToJulianDay(prevHYear, prevHMonth, d)
      const date = julianDayToGregorian(jd)
      days.push({
        dayNumber: d,
        date,
        hijriDay: d,
        hijriMonth: prevHMonth,
        hijriYear: prevHYear,
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const jd = hijriToJulianDay(hijriYear, hijriMonth, d)
      const date = julianDayToGregorian(jd)

      // Compare with currently selected date in Hijri
      const isSelected =
        selectedHijri !== null &&
        selectedHijri.year === hijriYear &&
        selectedHijri.month === hijriMonth &&
        selectedHijri.day === d

      days.push({
        dayNumber: d,
        date,
        hijriDay: d,
        hijriMonth,
        hijriYear,
        isCurrentMonth: true,
        isSelected,
      })
    }

    // Next month padding days to complete 35 cells (or 42 if needed)
    const totalCells = days.length <= 35 ? 35 : 42
    const remaining = totalCells - days.length
    const nextHYear = hijriMonth === 12 ? hijriYear + 1 : hijriYear
    const nextHMonth = hijriMonth === 12 ? 1 : hijriMonth + 1

    for (let d = 1; d <= remaining; d++) {
      const jd = hijriToJulianDay(nextHYear, nextHMonth, d)
      const date = julianDayToGregorian(jd)
      days.push({
        dayNumber: d,
        date,
        hijriDay: d,
        hijriMonth: nextHMonth,
        hijriYear: nextHYear,
        isCurrentMonth: false,
      })
    }

    return days
  }, [hijriYear, hijriMonth, selectedHijri])

  const hijriMonthObj = ISLAMIC_MONTHS[hijriMonth - 1] || ISLAMIC_MONTHS[0]

  // Crucial: keep early return AFTER all hooks
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="relative w-full max-w-[420px] sm:max-w-[460px] bg-[#F8F6F0] rounded-[34px] shadow-2xl border border-[#ECE7DC] p-5 pt-4 animate-scale-up select-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scenic Mosque Artwork in top right */}
        <div className="absolute right-0 top-0 w-[55%] h-40 pointer-events-none overflow-hidden rounded-tr-[34px]">
          <img
            src="/images/calendar-mosque-bg.png"
            alt="Mosque Landscape"
            className="w-full h-full object-cover object-right"
          />
          {/* Subtle gradient masks to blend cleanly with cream background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F8F6F0] via-[#F8F6F0]/50 to-transparent w-2/5"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#F8F6F0] via-transparent to-transparent"></div>
        </div>

        {/* Top Header Row (Icon, Title, Subtitle, Close Button) */}
        <div className="relative z-10 flex items-start justify-between pb-1">
          <div className="flex items-start gap-3">
            {/* Mint Green Rounded Square Icon */}
            <div className="w-12 h-12 rounded-2xl bg-[#E8F3EC] flex items-center justify-center border border-[#D5EADB]/60 flex-shrink-0 shadow-xs mt-0.5">
              {mode === 'gregorian' ? (
                <CalendarIcon className="w-6 h-6 text-[#0E543F] stroke-[2.2]" />
              ) : (
                <div className="relative w-6 h-6 flex items-center justify-center text-[#0E543F]">
                  <CalendarIcon className="w-6 h-6 stroke-[2.2]" />
                  <Moon className="w-2.5 h-2.5 absolute bottom-1 right-1 fill-current stroke-none text-[#0E543F]" />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-[21px] font-bold text-[#0D241A] tracking-tight leading-tight">
                Select Date
              </h2>
              <p className="text-[12.5px] text-[#63756C] font-normal mt-0.5">
                {mode === 'gregorian'
                  ? 'Choose a date from the English calendar.'
                  : 'Choose a date from the Islamic calendar.'}
              </p>
            </div>
          </div>

          {/* Close Button X */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-white/95 hover:bg-white flex items-center justify-center text-[#15271E] shadow-xs active:scale-95 transition cursor-pointer border border-stone-200/40"
          >
            <X className="w-4.5 h-4.5 stroke-[2.2]" />
          </button>
        </div>

        {/* Inner White Calendar Card */}
        <div className="relative z-10 bg-white rounded-[26px] border border-[#ECE7DC] p-4.5 pt-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] mt-3 mb-4 min-h-[340px]">
          {/* Month Navigation Row */}
          <div className="flex items-center justify-between">
            {/* Previous Month Arrow */}
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="w-10 h-10 rounded-full bg-[#EBF3ED] hover:bg-[#DEEDE2] text-[#0D4B39] flex items-center justify-center transition active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.4]" />
            </button>

            {/* Center Month-Year Pill (Clickable Dropdown Trigger) */}
            <button
              type="button"
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="px-5 py-2 rounded-full bg-[#F3F7F4] hover:bg-[#EBF3ED] flex items-center gap-1.5 cursor-pointer border border-[#E2EBE5]/60 transition group active:scale-98"
            >
              <span className="text-[14.5px] font-bold text-[#0D241A]">
                {mode === 'gregorian'
                  ? `${GREGORIAN_MONTHS[gregMonth]} ${gregYear}`
                  : `${hijriMonthObj.nameEn} ${hijriYear}`}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#0D241A] stroke-[2.5] transition-transform duration-200 ${
                  isPickerOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Next Month Arrow */}
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="w-10 h-10 rounded-full bg-[#EBF3ED] hover:bg-[#DEEDE2] text-[#0D4B39] flex items-center justify-center transition active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 stroke-[2.4]" />
            </button>
          </div>

          {/* Interactive Month & Year Full Picker View */}
          {isPickerOpen ? (
            <div className="mt-3 pt-1 animate-fade-in">
              {/* Type Switch Tabs */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#ECE7DC]">
                <span className="text-xs font-bold text-[#14261E]">Calendar Mode</span>
                <div className="flex items-center gap-1 bg-[#F1ECE1] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('gregorian')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      mode === 'gregorian'
                        ? 'bg-[#0C4F3B] text-white shadow-2xs'
                        : 'text-stone-600 hover:text-black'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('hijri')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      mode === 'hijri'
                        ? 'bg-[#0C4F3B] text-white shadow-2xs'
                        : 'text-stone-600 hover:text-black'
                    }`}
                  >
                    Islamic
                  </button>
                </div>
              </div>

              {/* Year Navigation Stepper & Dropdown */}
              <div className="flex items-center justify-between bg-[#F8F6F0] p-2 rounded-2xl mb-3 border border-[#EBE5D8]">
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'gregorian') {
                      handleSelectGregYear(gregYear - 1)
                    } else {
                      handleSelectHijriYear(hijriYear - 1)
                    }
                  }}
                  className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 flex items-center justify-center text-stone-700 shadow-2xs cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 font-medium">Year:</span>
                  {mode === 'gregorian' ? (
                    <select
                      aria-label="Select Gregorian Year"
                      value={gregYear}
                      onChange={(e) => handleSelectGregYear(parseInt(e.target.value, 10))}
                      className="bg-white border border-[#DDD5C5] text-[#14261E] text-sm font-bold rounded-xl px-3 py-1 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#0C4F3B]"
                    >
                      {GREGORIAN_YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      aria-label="Select Islamic Year"
                      value={hijriYear}
                      onChange={(e) => handleSelectHijriYear(parseInt(e.target.value, 10))}
                      className="bg-white border border-[#DDD5C5] text-[#14261E] text-sm font-bold rounded-xl px-3 py-1 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#0C4F3B]"
                    >
                      {HIJRI_YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y} AH
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'gregorian') {
                      handleSelectGregYear(gregYear + 1)
                    } else {
                      handleSelectHijriYear(hijriYear + 1)
                    }
                  }}
                  className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 flex items-center justify-center text-stone-700 shadow-2xs cursor-pointer active:scale-95"
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.2]" />
                </button>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 gap-2">
                {mode === 'gregorian'
                  ? GREGORIAN_MONTHS_SHORT.map((mName, idx) => {
                      const isSelected = gregMonth === idx
                      return (
                        <button
                          key={mName}
                          type="button"
                          onClick={() => handleSelectGregMonth(idx)}
                          className={`py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-[#0C4F3B] text-white shadow-xs'
                              : 'bg-[#F8F6F0] hover:bg-[#EBF3ED] text-[#14261E] border border-[#EAE4D7]'
                          }`}
                        >
                          {mName}
                        </button>
                      )
                    })
                  : ISLAMIC_MONTHS.map((mObj) => {
                      const isSelected = hijriMonth === mObj.index
                      return (
                        <button
                          key={mObj.index}
                          type="button"
                          onClick={() => handleSelectHijriMonth(mObj.index)}
                          className={`py-1.5 px-1 rounded-xl text-[11px] font-bold leading-tight transition active:scale-95 cursor-pointer truncate ${
                            isSelected
                              ? 'bg-[#0C4F3B] text-white shadow-xs'
                              : 'bg-[#F8F6F0] hover:bg-[#EBF3ED] text-[#14261E] border border-[#EAE4D7]'
                          }`}
                          title={`${mObj.nameEn} (${mObj.nameAr})`}
                        >
                          <span>{mObj.nameEn.split(' ')[0]}</span>
                        </button>
                      )
                    })}
              </div>

              {/* Done button */}
              <div className="mt-3 pt-2 border-t border-[#ECE7DC] flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-[#0C4F3B] text-white text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Weekday Labels Header */}
              <div className="grid grid-cols-7 gap-1 text-center mt-3.5 mb-2">
                {WEEK_DAYS.map((day) => (
                  <span key={day} className="text-[12.5px] font-medium text-[#7C8D84]">
                    {day}
                  </span>
                ))}
              </div>

              {/* Gregorian Days Grid (Screenshot 1) */}
              {mode === 'gregorian' && (
                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {gregorianDays.map((item, idx) => {
                    if (!item.isCurrentMonth) {
                      return (
                        <button
                          key={`greg-pad-${idx}`}
                          type="button"
                          onClick={() => {
                            setSelectedDate(item.date)
                            setGregYear(item.date.getFullYear())
                            setGregMonth(item.date.getMonth())
                          }}
                          className="h-11 flex items-center justify-center text-[14px] font-normal text-[#B7C2BC] hover:bg-stone-50 rounded-xl cursor-pointer"
                        >
                          {item.dayNumber}
                        </button>
                      )
                    }

                    if (item.isSelected) {
                      return (
                        <div
                          key={`greg-selected-${item.dayNumber}`}
                          className="h-11 flex items-center justify-center"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedDate(item.date)}
                            className="w-11 h-11 rounded-[14px] bg-[#0C4F3B] text-white flex flex-col items-center justify-center shadow-xs cursor-pointer active:scale-95 transition"
                          >
                            <span className="text-[14.5px] font-bold leading-none">
                              {item.dayNumber}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-white mt-1"></span>
                          </button>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={`greg-day-${item.dayNumber}`}
                        className="h-11 flex items-center justify-center"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedDate(item.date)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-[14.5px] font-semibold text-[#182B22] hover:bg-[#F3F7F4] active:scale-95 transition cursor-pointer"
                        >
                          {item.dayNumber}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Islamic / Hijri Days Grid (Screenshot 2) */}
              {mode === 'hijri' && (
                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {hijriDays.map((item, idx) => {
                    if (!item.isCurrentMonth) {
                      return (
                        <button
                          key={`hijri-pad-${idx}`}
                          type="button"
                          onClick={() => {
                            setSelectedDate(item.date)
                            if (item.hijriYear && item.hijriMonth) {
                              setHijriYear(item.hijriYear)
                              setHijriMonth(item.hijriMonth)
                            }
                          }}
                          className="h-11 flex items-center justify-center text-[14px] font-normal text-[#B7C2BC] hover:bg-stone-50 rounded-xl cursor-pointer"
                        >
                          {item.dayNumber}
                        </button>
                      )
                    }

                    if (item.isSelected) {
                      return (
                        <div
                          key={`hijri-selected-${item.dayNumber}`}
                          className="h-11 flex items-center justify-center"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedDate(item.date)}
                            className="w-11 h-11 rounded-[14px] bg-[#0C4F3B] text-white flex flex-col items-center justify-center shadow-xs cursor-pointer active:scale-95 transition"
                          >
                            <span className="text-[14.5px] font-bold leading-none">
                              {item.dayNumber}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-white mt-1"></span>
                          </button>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={`hijri-day-${item.dayNumber}`}
                        className="h-11 flex items-center justify-center"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedDate(item.date)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-[14.5px] font-semibold text-[#182B22] hover:bg-[#F3F7F4] active:scale-95 transition cursor-pointer"
                        >
                          {item.dayNumber}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Action Buttons Row */}
        <div className="relative z-10 flex items-center gap-3">
          {/* Cancel Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-[16px] bg-white border border-[#0C4F3B] hover:bg-[#F2F8F5] text-[#0C4F3B] font-semibold text-[15px] transition active:scale-98 text-center cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          {/* Select Date Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3.5 rounded-[16px] bg-[#0C4F3B] hover:bg-[#083D2D] text-white font-semibold text-[15px] shadow-sm transition active:scale-98 text-center cursor-pointer"
          >
            Select Date
          </button>
        </div>
      </div>
    </div>
  )
}
