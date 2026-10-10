import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { NextPrayerCard } from '../components/NextPrayerCard'
import { TodaysSalah } from '../components/TodaysSalah'
import { HadithCard } from '../components/HadithCard'
import { TodaysDeeds } from '../components/TodaysDeeds'
import { StrengthenIman } from '../components/StrengthenIman'
import { BottomNav, type NavTab } from '../components/BottomNav'
import { MySalahScreen } from '../components/MySalahScreen'
import { HadithScreen } from '../components/HadithScreen'
import { ProgressScreen } from '../components/ProgressScreen'
import { SettingsScreen } from '../components/SettingsScreen'
import {
  HadithModal,
  LessonModal,
  NotificationsModal,
  LocationModal,
  PrayerDetailModal,
  PrayerStatusModal,
  type HadithDetailData,
} from '../components/Modals'
import { AuthModal } from '../components/AuthModal'
import { CalendarModal, type CalendarMode } from '../components/CalendarModal'
import { useAuth } from '../context/AuthContext'
import { salahApi } from '../services/backendApi'
import { HADITH_COLLECTION, type DailyHadith } from '../data/hadiths'
import {
  INDIAN_CITIES,
  calculateIndiaPrayerTimes,
  getPrayerStatusDetails,
  fetchAladhanPrayerTimes,
  formatPrayerTime,
  formatTime12,
  formatISTTime,
  formatGregorianDate,
  formatHijriDate,
  type CityInfo,
} from '../utils/prayerTimes'
import {
  getDateKey,
  loadPrayerRecords,
  updatePrayerStatus,
  computeWeeklyStats,
  type AllRecords,
} from '../utils/prayerRecords'
import { reverseGeocodeCoordinates } from '../utils/geocoding'
import type { PrayerItem, DeedItem, PrayerStatus } from '../types'
import { LogOut, Volume2 } from 'lucide-react'
import { useSalahNotifications } from '../hooks/useSalahNotifications'

export const AppDashboard = () => {
  const navigate = useNavigate()
  const { user: currentUser, logout, banner, setBanner } = useAuth()

  // Current active Indian city with address persistence
  const [city, setCity] = useState<CityInfo>(() => {
    try {
      const saved = localStorage.getItem('salah_saved_location')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.name === 'New Delhi' && !parsed.isGPS) {
          return INDIAN_CITIES[0]
        }
        return parsed
      }
    } catch {}
    return INDIAN_CITIES[0]
  })
  const [isDetectingGPS, setIsDetectingGPS] = useState(false)

  // Live real-time clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  // Prayer calculation settings with localStorage persistence
  const [calculationMethod, setCalculationMethod] = useState(() => {
    if (currentUser?.prayerCalculationMethod) return currentUser.prayerCalculationMethod
    try {
      return localStorage.getItem('salah_calc_method') || 'Islamic University, Karachi'
    } catch {
      return 'Islamic University, Karachi'
    }
  })
  const [madhab, setMadhab] = useState(() => {
    try {
      return localStorage.getItem('salah_madhab') || "Shafi'i"
    } catch {
      return "Shafi'i"
    }
  })
  const [timeFormat, setTimeFormat] = useState(() => {
    try {
      return localStorage.getItem('salah_time_format') || '12-hour (AM/PM)'
    } catch {
      return '12-hour (AM/PM)'
    }
  })

  // Real-world Salah prayer notification system
  const {
    preferences: notifPreferences,
    updatePreferences: handleUpdateNotifPreferences,
    history: notifHistory,
    unreadCount: notifUnreadCount,
    activeToast: inAppNotifToast,
    dismissToast: handleDismissInAppToast,
    browserPermission,
    toggleBrowserPush: handleToggleBrowserPush,
    markAsRead: handleMarkNotifRead,
    markAllAsRead: handleMarkAllNotifsRead,
    sendTestNotification: handleSendTestNotif,
  } = useSalahNotifications({
    userId: currentUser?.id,
    latitude: city.lat,
    longitude: city.lng,
    calculationMethod,
    madhab,
  })

  const handleChangeCalculationMethod = (method: string) => {
    setCalculationMethod(method)
    try {
      localStorage.setItem('salah_calc_method', method)
    } catch {}
  }

  const handleChangeMadhab = (newMadhab: string) => {
    setMadhab(newMadhab)
    try {
      localStorage.setItem('salah_madhab', newMadhab)
    } catch {}
  }

  const handleToggleMadhab = () => {
    const next = madhab === "Shafi'i" ? 'Hanafi' : "Shafi'i"
    handleChangeMadhab(next)
  }

  const handleChangeTimeFormat = (format: string) => {
    setTimeFormat(format)
    try {
      localStorage.setItem('salah_time_format', format)
    } catch {}
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime((prev) => new Date(prev.getTime() + 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const is24Hour = timeFormat.includes('24')

  // Real astronomical Islamic calculations based on live time, coordinates, and juristic settings
  const prayerData = calculateIndiaPrayerTimes(
    city.lat,
    city.lng,
    city.name,
    currentTime,
    calculationMethod,
    madhab
  )

  // Background fetch of official Aladhan timings to verify
  useEffect(() => {
    fetchAladhanPrayerTimes(city.lat, city.lng, currentTime, calculationMethod, madhab)
  }, [city.lat, city.lng, calculationMethod, madhab])

  const istTimeStr = formatISTTime(currentTime)
  const gregorianDateStr = formatGregorianDate(currentTime)
  const hijriDateStr = formatHijriDate(currentTime)

  // Persistent real-world prayer records
  const [allPrayerRecords, setAllPrayerRecords] = useState<AllRecords>(() =>
    loadPrayerRecords()
  )

  const todayDateKey = getDateKey(currentTime)
  const todayRecords = allPrayerRecords[todayDateKey] || {}

  const prayerIds: Array<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'> = [
    'fajr',
    'dhuhr',
    'asr',
    'maghrib',
    'isha',
  ]

  // Prayer status modal state
  const [isPrayerStatusModalOpen, setIsPrayerStatusModalOpen] = useState(false)
  const [prayerForStatusModal, setPrayerForStatusModal] = useState<PrayerItem | null>(null)

  const handleOpenPrayerStatusModal = (prayer: PrayerItem) => {
    setPrayerForStatusModal(prayer)
    setIsPrayerStatusModalOpen(true)
  }

  const handleSelectPrayerStatus = (prayerId: string, status: PrayerStatus | null) => {
    const updated = updatePrayerStatus(todayDateKey, prayerId, status)
    setAllPrayerRecords(updated)
    if (selectedPrayerDetail && selectedPrayerDetail.id === prayerId) {
      setSelectedPrayerDetail({
        ...selectedPrayerDetail,
        prayerStatus: status,
        completed: status === 'ON_TIME' || status === 'LATE' || status === 'QADA',
      })
    }

    // Check for genuine achievement milestone: all 5 prayers completed today
    const todaysMap = updated[todayDateKey] || {}
    const allDone = prayerIds.every((pId) => {
      const s = pId === prayerId ? status : todaysMap[pId]
      return s === 'ON_TIME' || s === 'LATE' || s === 'QADA'
    })

    if (allDone) {
      const milestoneKey = `salah_celebrated_${todayDateKey}`
      if (!sessionStorage.getItem(milestoneKey)) {
        sessionStorage.setItem(milestoneKey, 'true')
        setBanner({
          type: 'success',
          message: '🎉 Alhamdulillah! You have completed all 5 prayers today. May Allah accept your salah and bless your day!',
        })
      }
    }

    // Sync with backend API
    if (status) {
      const mappedStatus = status === 'ON_TIME' ? 'on_time' : status === 'LATE' ? 'late' : 'missed'
      const prayerDate = prayerData ? (prayerData as any)[prayerId] : null
      const nextPrayerMap: Record<string, string> = {
        fajr: 'sunrise',
        dhuhr: 'asr',
        asr: 'maghrib',
        maghrib: 'isha',
        isha: 'tomorrowFajr',
      }
      const nextKey = nextPrayerMap[prayerId] || prayerId
      const nextPrayerDate = prayerData ? (prayerData as any)[nextKey] : null

      const startTime = prayerDate instanceof Date && !isNaN(prayerDate.getTime())
        ? prayerDate.toISOString()
        : new Date().toISOString()
      const endTime = nextPrayerDate instanceof Date && !isNaN(nextPrayerDate.getTime())
        ? nextPrayerDate.toISOString()
        : new Date(Date.now() + 2 * 3600 * 1000).toISOString()

      salahApi
        .logPrayer({
          userId: currentUser?.id || 'guest_user',
          prayerName: prayerId,
          prayerStartTime: startTime,
          prayerEndTime: endTime,
          logTimestamp: new Date().toISOString(),
          status: mappedStatus as any,
        })
        .catch(() => {})
    }
  }

  const prayerIcons: Record<string, PrayerItem['iconType']> = {
    fajr: 'moon',
    dhuhr: 'sun',
    asr: 'cloud-sun',
    maghrib: 'sunset',
    isha: 'night-moon',
  }

  const prayers: PrayerItem[] = prayerIds.map((id) => {
    const prayerStatus = todayRecords[id] || null
    const isCompleted =
      prayerStatus === 'ON_TIME' ||
      prayerStatus === 'LATE' ||
      prayerStatus === 'QADA'

    const status = getPrayerStatusDetails(
      id,
      prayerData,
      currentTime,
      isCompleted,
      is24Hour
    )
    return {
      id,
      name: status.name,
      time: status.timeFormatted,
      iconType: prayerIcons[id],
      completed: isCompleted,
      prayerStatus,
      rawDate: status.prayerTime,
      windowEndDate: status.windowEndTime,
      statusBadge: status.statusBadge,
      statusBadgeText: status.statusBadgeText,
      subtitle: status.subtitle,
      windowText: status.windowFormatted,
    }
  })

  const handleTogglePrayer = (id: string) => {
    const matched = prayers.find((p) => p.id === id)
    if (matched) {
      handleOpenPrayerStatusModal(matched)
    }
  }

  const weeklyStats = useMemo(() => {
    return computeWeeklyStats(allPrayerRecords, currentTime)
  }, [allPrayerRecords, currentTime])

  const [deeds, setDeeds] = useState<DeedItem[]>([
    { id: 'quran', title: 'Read Quran', iconType: 'quran', completed: false },
    { id: 'istighfar', title: 'Istighfar', iconType: 'tasbih', completed: false },
    { id: 'adhkar-morning', title: 'Morning Adhkar', iconType: 'adhkar-morning', completed: false },
    { id: 'help', title: 'Help someone', iconType: 'help', completed: false },
    { id: 'adhkar-evening', title: 'Evening Adhkar', iconType: 'adhkar-evening', completed: false },
    { id: 'parents', title: 'Be kind to parents', iconType: 'parents', completed: false },
  ])

  const [activeTab, setActiveTab] = useState<NavTab>('home')

  // Modals state
  const [isHadithOpen, setIsHadithOpen] = useState(false)
  const [selectedHadithDetail, setSelectedHadithDetail] = useState<HadithDetailData | null>(null)
  const [activeHadithIndex, setActiveHadithIndex] = useState(0)
  const [isLessonOpen, setIsLessonOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [selectedPrayerDetail, setSelectedPrayerDetail] = useState<PrayerItem | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('gregorian')
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const handleToggleDeed = (id: string) => {
    setDeeds((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    )
  }

  const handleDetectGPS = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }

    setIsDetectingGPS(true)
    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const lat = pos.coords.latitude
            const lng = pos.coords.longitude
            const resolved = await reverseGeocodeCoordinates(lat, lng)
            const newCity: CityInfo = {
              name: resolved.displayShort || resolved.name || resolved.city,
              state: resolved.state,
              lat,
              lng,
              suburb: resolved.suburb,
              fullAddress: resolved.fullAddress,
              displayShort: resolved.displayShort,
              isGPS: true,
              accuracy: pos.coords.accuracy,
            }
            setCity(newCity)
            try {
              localStorage.setItem('salah_saved_location', JSON.stringify(newCity))
            } catch {}
          } catch (e) {
            console.error('Failed to reverse geocode:', e)
          } finally {
            setIsDetectingGPS(false)
            resolve()
          }
        },
        (err) => {
          setIsDetectingGPS(false)
          console.warn('Geolocation error:', err)
          alert('Could not access GPS location. Please select your location from the search bar.')
          resolve()
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    })
  }

  const handleSelectCity = (newCity: CityInfo) => {
    const updated = { ...newCity, isGPS: false }
    setCity(updated)
    try {
      localStorage.setItem('salah_saved_location', JSON.stringify(updated))
    } catch {}
  }

  const hoursRemaining = Math.floor(prayerData.timeRemainingSeconds / 3600)
  const minutesRemaining = Math.floor((prayerData.timeRemainingSeconds % 3600) / 60)
  const format2 = (n: number) => n.toString().padStart(2, '0')
  const startsInText = `Starts in ${format2(hoursRemaining)}h ${format2(minutesRemaining)}m`
  const prayerProgressPercent = Math.max(
    0.05,
    Math.min(
      0.95,
      1 - prayerData.timeRemainingSeconds / prayerData.totalWindowSeconds
    )
  )

  const handleOpenHadithWithData = (data?: HadithDetailData | DailyHadith) => {
    if (data) {
      setSelectedHadithDetail(data)
      const foundIdx = HADITH_COLLECTION.findIndex(
        (h) => h.arabic === data.arabic || h.english === data.english
      )
      if (foundIdx !== -1) {
        setActiveHadithIndex(foundIdx)
      }
    } else {
      setSelectedHadithDetail(HADITH_COLLECTION[activeHadithIndex] || HADITH_COLLECTION[0])
    }
    setIsHadithOpen(true)
  }

  const handleNextModalHadith = () => {
    setActiveHadithIndex((prev) => {
      const nextIdx = (prev + 1) % HADITH_COLLECTION.length
      setSelectedHadithDetail(HADITH_COLLECTION[nextIdx])
      return nextIdx
    })
  }

  const handlePrevModalHadith = () => {
    setActiveHadithIndex((prev) => {
      const prevIdx = (prev - 1 + HADITH_COLLECTION.length) % HADITH_COLLECTION.length
      setSelectedHadithDetail(HADITH_COLLECTION[prevIdx])
      return prevIdx
    })
  }

  const handleSignOut = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#EDE8DE] flex flex-col items-center justify-start sm:py-6 antialiased font-sans">
      {/* Top Application Bar with Navigation to Dashboard Tabs & Logout */}
      <div className="w-full max-w-6xl xl:max-w-7xl px-4 sm:px-6 lg:px-8 mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-stone-800 text-xs font-bold shadow-xs border border-stone-200/80 transition cursor-pointer"
          title="Salah Companion Dashboard Home"
        >
          <div className="w-5 h-5 rounded-md overflow-hidden bg-[#0E3D2E] flex-shrink-0">
            <img src="/images/app-logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-serif font-bold text-emerald-950 text-xs sm:text-sm tracking-tight">Salah Companion</span>
        </button>

        {/* Center: Desktop Navigation Bar for Post-Login Screens */}
        <nav className="hidden md:flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full border border-stone-200 shadow-xs">
          {[
            { id: 'home', label: 'Home', icon: '🕌' },
            { id: 'salah', label: 'My Salah', icon: '⏰' },
            { id: 'quran', label: 'Hadith & Quran', icon: '📖' },
            { id: 'progress', label: 'Progress', icon: '📊' },
            { id: 'settings', label: 'Settings', icon: '⚙️' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as NavTab)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0C4535] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Right: User Greeting & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser?.name && (
            <span className="hidden lg:inline text-xs font-medium text-stone-600 bg-white/80 px-3 py-1.5 rounded-full border border-stone-200/60 shadow-2xs">
              Salam, <strong className="text-emerald-900 font-semibold">{currentUser.name.split(' ')[0]}</strong>
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold shadow-xs border border-rose-200 transition cursor-pointer"
            title="Sign out of your account"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Floating Auto-dismissing Welcome / Verification Banner */}
      {banner && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 max-w-md w-auto px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-md border animate-fade-in transition-all text-xs sm:text-sm font-medium"
          style={{
            backgroundColor: banner.type === 'success' ? '#0E4D38' : '#991B1B',
            borderColor: banner.type === 'success' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)',
            color: '#FFFFFF',
          }}
        >
          <span className="flex-1 leading-snug">{banner.message}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition flex-shrink-0 cursor-pointer text-xs"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </aside>
      )}

      {/* Real-World Salah Prayer Time In-App Alert Toast */}
      {inAppNotifToast && (
        <aside
          role="alert"
          aria-live="assertive"
          className="fixed top-5 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-auto p-4 rounded-2xl shadow-2xl bg-[#092B21] border border-emerald-500/40 text-white animate-fade-in transition-all flex flex-col gap-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-800/80 text-emerald-200 flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  {inAppNotifToast.title}
                </h4>
                <span className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider block mt-0.5">
                  {inAppNotifToast.reminderType === 'start'
                    ? 'Salah Time Started'
                    : '30-Minute Pending Alert'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissInAppToast}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition flex-shrink-0 cursor-pointer text-xs"
              aria-label="Dismiss prayer alert"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-stone-200 leading-relaxed pl-10 pr-2">
            {inAppNotifToast.body}
          </p>

          <div className="flex items-center justify-end gap-2 pl-10 pt-1">
            <button
              type="button"
              onClick={() => {
                handleMarkNotifRead(inAppNotifToast.id)
                handleDismissInAppToast()
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-stone-300 hover:text-white transition cursor-pointer"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                handleMarkNotifRead(inAppNotifToast.id)
                handleDismissInAppToast()
                setActiveTab('salah')
              }}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-[#E2B755] hover:bg-[#D4A33B] text-[#0C382B] shadow-xs transition cursor-pointer flex items-center gap-1"
            >
              Open Salah Tracker →
            </button>
          </div>
        </aside>
      )}

      {/* Main App Container - Natural Responsive Viewport across Mobile, Tablet, Laptop and Desktop */}
      <main className="w-full max-w-6xl xl:max-w-7xl min-h-screen sm:min-h-0 bg-[#FAF8F3] sm:rounded-2xl lg:rounded-3xl shadow-xl sm:border border-stone-200/80 relative overflow-x-hidden pb-6 flex flex-col justify-between">
        <div className="w-full">
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <div className="animate-fade-in">
              <Header
                currentTimeStr={istTimeStr}
                cityName={city.name}
                gregorianDateStr={gregorianDateStr}
                hijriDateStr={hijriDateStr}
                isGPS={!!city.isGPS}
                coords={{ lat: city.lat, lng: city.lng }}
                userName={currentUser?.name}
                unreadCount={notifUnreadCount}
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onOpenProfile={() => setIsAuthModalOpen(true)}
                onOpenLocation={() => setIsLocationOpen(true)}
                onOpenEnglishCalendar={() => {
                  setCalendarMode('gregorian')
                  setIsCalendarOpen(true)
                }}
                onOpenArabicCalendar={() => {
                  setCalendarMode('hijri')
                  setIsCalendarOpen(true)
                }}
              />

              {/* 2-Column Responsive Dashboard on Laptop/Desktop */}
              <div className="w-full lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start lg:px-8 mt-2">
                {/* Left Column (7 cols): Main Prayer & Timings flow */}
                <div className="lg:col-span-7 space-y-4">
                  <NextPrayerCard
                    prayerName={prayerData.nextPrayerName}
                    prayerTimeStr={
                      is24Hour
                        ? formatPrayerTime(prayerData.nextPrayerTime, true)
                        : formatTime12(prayerData.nextPrayerTime)
                    }
                    startsInText={startsInText}
                    remainingSeconds={prayerData.timeRemainingSeconds}
                    progressPercent={prayerProgressPercent}
                    onDetailsClick={() => {
                      const matched = prayers.find(
                        (p) => p.name.toLowerCase() === prayerData.nextPrayerName.toLowerCase()
                      )
                      if (matched) setSelectedPrayerDetail(matched)
                      else setActiveTab('salah')
                    }}
                  />

                  <TodaysSalah
                    prayers={prayers}
                    onTogglePrayer={handleTogglePrayer}
                    madhab={madhab}
                    onToggleMadhab={handleToggleMadhab}
                  />

                  <HadithCard
                    onReadFullHadith={(hadith) => {
                      handleOpenHadithWithData(hadith)
                    }}
                  />
                </div>

                {/* Right Column (5 cols): Daily Deeds & Learning */}
                <div className="lg:col-span-5 space-y-4 mt-4 lg:mt-0">
                  <TodaysDeeds deeds={deeds} onToggleDeed={handleToggleDeed} />

                  <StrengthenIman onLearnClick={() => setIsLessonOpen(true)} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY SALAH */}
          {activeTab === 'salah' && (
            <MySalahScreen
              prayers={prayers}
              onTogglePrayer={handleTogglePrayer}
              onBack={() => setActiveTab('home')}
              onOpenCalendar={() => {
                setCalendarMode('gregorian')
                setIsCalendarOpen(true)
              }}
              onSelectPrayerDetail={(p) => setSelectedPrayerDetail(p)}
              cityName={city.name}
              calculationMethod={calculationMethod}
              madhab={madhab}
              onToggleMadhab={handleToggleMadhab}
              isGPS={!!city.isGPS}
              coords={{ lat: city.lat, lng: city.lng }}
            />
          )}

          {/* TAB 3: HADITH */}
          {activeTab === 'quran' && (
            <HadithScreen
              onBack={() => setActiveTab('home')}
              onOpenFullHadith={handleOpenHadithWithData}
              gregorianDateStr={gregorianDateStr}
              hijriDateStr={hijriDateStr}
              onOpenEnglishCalendar={() => {
                setCalendarMode('gregorian')
                setIsCalendarOpen(true)
              }}
              onOpenArabicCalendar={() => {
                setCalendarMode('hijri')
                setIsCalendarOpen(true)
              }}
            />
          )}

          {/* TAB 4: PROGRESS */}
          {activeTab === 'progress' && (
            <ProgressScreen
              onBack={() => setActiveTab('home')}
              onOpenCalendar={() => {
                setCalendarMode('gregorian')
                setIsCalendarOpen(true)
              }}
              weeklyStats={weeklyStats}
              quranDaysCount={deeds.find((d) => d.id === 'quran')?.completed ? 1 : 0}
              deedsCompletedCount={deeds.filter((d) => d.completed).length}
            />
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <SettingsScreen
              cityName={city.name}
              onOpenLocation={() => setIsLocationOpen(true)}
              calculationMethod={calculationMethod}
              onChangeCalculationMethod={handleChangeCalculationMethod}
              madhab={madhab}
              onChangeMadhab={handleChangeMadhab}
              timeFormat={timeFormat}
              onChangeTimeFormat={handleChangeTimeFormat}
              user={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              notificationPreferences={notifPreferences}
              onUpdateNotificationPreferences={handleUpdateNotifPreferences}
              onToggleBrowserPush={handleToggleBrowserPush}
              browserPermission={browserPermission}
              onSendTestNotification={handleSendTestNotif}
            />
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Modals */}
        <HadithModal
          isOpen={isHadithOpen}
          onClose={() => {
            setIsHadithOpen(false)
            setSelectedHadithDetail(null)
          }}
          hadithData={selectedHadithDetail || HADITH_COLLECTION[activeHadithIndex]}
          onNextHadith={handleNextModalHadith}
          onPrevHadith={handlePrevModalHadith}
          currentIndex={activeHadithIndex}
          totalCount={HADITH_COLLECTION.length}
        />
        <LessonModal isOpen={isLessonOpen} onClose={() => setIsLessonOpen(false)} />
        <NotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          history={notifHistory}
          unreadCount={notifUnreadCount}
          onMarkAsRead={handleMarkNotifRead}
          onMarkAllAsRead={handleMarkAllNotifsRead}
          onOpenTracker={() => setActiveTab('salah')}
          onSendTestNotification={handleSendTestNotif}
        />
        <LocationModal
          isOpen={isLocationOpen}
          onClose={() => setIsLocationOpen(false)}
          selectedCity={city.name}
          currentAddress={
            city.fullAddress ||
            city.displayShort ||
            (city.state ? `${city.name}, ${city.state}, India` : `${city.name}, India`)
          }
          currentCityInfo={city}
          calculationMethod={calculationMethod}
          madhab={madhab}
          cities={INDIAN_CITIES}
          onSelectCity={handleSelectCity}
          onDetectGPS={handleDetectGPS}
          isDetectingGPS={isDetectingGPS}
        />
        <PrayerDetailModal
          isOpen={!!selectedPrayerDetail}
          onClose={() => setSelectedPrayerDetail(null)}
          prayer={selectedPrayerDetail}
          onTogglePrayer={handleTogglePrayer}
          onOpenStatusModal={handleOpenPrayerStatusModal}
          cityName={city.name}
          calculationMethod={calculationMethod}
          madhab={madhab}
        />
        <PrayerStatusModal
          isOpen={isPrayerStatusModalOpen}
          onClose={() => {
            setIsPrayerStatusModalOpen(false)
            setPrayerForStatusModal(null)
          }}
          prayer={prayerForStatusModal}
          onSelectStatus={handleSelectPrayerStatus}
        />
        {isCalendarOpen && (
          <CalendarModal
            isOpen={isCalendarOpen}
            onClose={() => setIsCalendarOpen(false)}
            initialMode={calendarMode}
            activeDate={currentTime}
            onSelectDate={(newDate) => {
              const now = new Date()
              const target = new Date(newDate)
              target.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
              setCurrentTime(target)
            }}
          />
        )}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          user={currentUser}
          onAuthSuccess={() => {}}
          onLogout={handleSignOut}
          currentCoords={{ lat: city.lat, lng: city.lng }}
          currentCityName={city.name}
        />
      </main>
    </div>
  )
}

export default AppDashboard
