import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  ChevronRight,
  MapPin,
  Calendar,
  BookOpen,
  Bell,
  Sun,
  Moon,
  Monitor,
  Globe,
  Clock,
  Info,
  Shield,
  FileText,
  Volume2,
  Smartphone,
  Loader2,
  BellRing,
  Compass,
} from 'lucide-react'
import type { UserProfile, NotificationPreferences } from '../services/backendApi'

interface SettingsScreenProps {
  cityName: string
  onOpenLocation: () => void
  onOpenQibla?: () => void
  calculationMethod: string
  onChangeCalculationMethod: (method: string) => void
  madhab: string
  onChangeMadhab: (madhab: string) => void
  timeFormat: string
  onChangeTimeFormat: (format: string) => void
  user?: UserProfile | null
  onOpenAuthModal?: () => void
  // Production Salah Notification system props
  notificationPreferences?: NotificationPreferences
  onUpdateNotificationPreferences?: (prefs: Partial<NotificationPreferences>) => Promise<void>
  onToggleBrowserPush?: () => Promise<{ success: boolean; message: string }>
  browserPermission?: string
  onSendTestNotification?: () => Promise<{ success: boolean; message: string }>
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  cityName,
  onOpenLocation,
  onOpenQibla,
  calculationMethod,
  onChangeCalculationMethod,
  madhab,
  onChangeMadhab,
  timeFormat,
  onChangeTimeFormat,
  user,
  onOpenAuthModal,
  notificationPreferences,
  onUpdateNotificationPreferences,
  onToggleBrowserPush,
  browserPermission = 'default',
  onSendTestNotification,
}) => {
  const navigate = useNavigate()
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')

  // Notification toggles
  const [reminders, setReminders] = useState({
    hadith: true,
    quran: true,
    dhikr: true,
    deeds: true,
  })

  // Fallback internal notification preferences
  const [internalPrefs, setInternalPrefs] = useState<NotificationPreferences>({
    prayerStartEnabled: true,
    reminder30MinEnabled: true,
    browserPushEnabled: false,
    fajrEnabled: true,
    dhuhrEnabled: true,
    asrEnabled: true,
    maghribEnabled: true,
    ishaEnabled: true,
  })

  const currentPrefs = notificationPreferences || internalPrefs

  const handleUpdatePref = (key: keyof NotificationPreferences, value: boolean) => {
    setInternalPrefs((prev) => ({ ...prev, [key]: value }))
    if (onUpdateNotificationPreferences) {
      onUpdateNotificationPreferences({ [key]: value })
    }
  }

  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null)
  const [isPushLoading, setIsPushLoading] = useState(false)
  const [testStatusMessage, setTestStatusMessage] = useState<string | null>(null)

  const handleTogglePush = async () => {
    if (onToggleBrowserPush) {
      setIsPushLoading(true)
      setPushStatusMessage(null)
      try {
        const res = await onToggleBrowserPush()
        setPushStatusMessage(res.message)
      } catch (err: any) {
        setPushStatusMessage(err.message || 'Error updating push notifications')
      } finally {
        setIsPushLoading(false)
        setTimeout(() => setPushStatusMessage(null), 5000)
      }
    }
  }

  const handleTestAlert = async () => {
    if (onSendTestNotification) {
      setTestStatusMessage('Sending test prayer alert...')
      try {
        const res = await onSendTestNotification()
        setTestStatusMessage(res.message || '✓ Test alert dispatched successfully!')
      } catch {
        setTestStatusMessage('Could not dispatch test alert.')
      } finally {
        setTimeout(() => setTestStatusMessage(null), 4000)
      }
    }
  }

  const toggleReminder = (key: keyof typeof reminders) => {
    setReminders((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="w-full pb-20 md:pb-8 animate-fade-in select-none">
      {/* Header Bar */}
      <div className="relative px-5 sm:px-6 lg:px-8 pt-3 pb-3 overflow-hidden">
        {/* Background Artwork on top right */}
        <div className="absolute right-0 top-0 w-3/5 sm:w-2/5 lg:w-1/3 h-44 pointer-events-none opacity-90 overflow-hidden">
          <img
            src="/images/settings-header-bg.png"
            alt="Mosque View"
            className="w-full h-full object-cover object-left"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAF8F3] via-[#FAF8F3]/60 to-transparent w-2/5"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F3] via-transparent to-transparent"></div>
        </div>

        {/* Title */}
        <div className="relative z-10 pt-2">
          <h1 className="text-[26px] font-bold text-[#14261E] tracking-tight leading-tight">
            Settings
          </h1>
          <p className="text-[13px] text-[#5A6A61] font-normal mt-0.5">
            Customize your experience.
          </p>
        </div>
      </div>

      <div className="px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (6 cols): Profile, Prayer Settings, Preferences */}
          <div className="lg:col-span-6 space-y-4">
            {/* Card 1: User Profile */}
            <div
              onClick={onOpenAuthModal}
              className="w-full rounded-[22px] bg-white border border-[#EDE8DC] p-3.5 flex items-center justify-between shadow-xs hover:border-emerald-300 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#EAF5EF] border border-[#CEE5D8] flex items-center justify-center text-[#0E543F]">
                  {user ? (
                    <span className="text-lg font-bold text-[#0E543F]">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="w-6 h-6 stroke-[1.8]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-[15px] font-bold text-[#14261E] leading-tight">
                      {user ? user.name : 'Sign In / Register'}
                    </h3>
                    {user && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-[#0E543F] px-1.5 py-0.2 rounded-full border border-emerald-200">
                        {user.role}
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-[#697A71] mt-0.5 leading-tight">
                    {user ? user.email : 'Tap to sign in or create an account'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>

            {/* Admin Portal Shortcut Card (Rendered for ADMIN role) */}
            {user?.role === 'ADMIN' && (
              <div
                onClick={() => navigate('/admin')}
                className="w-full rounded-[22px] bg-gradient-to-r from-[#07241A] via-[#0C382B] to-[#114E3C] border border-amber-400/40 p-4 shadow-md flex items-center justify-between cursor-pointer hover:border-amber-300 transition group select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
                    <Shield className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-[14px] font-bold text-white leading-tight">Admin Dashboard</h4>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-400 text-[#07241A] px-1.5 py-0.5 rounded-full shadow-2xs">
                        Admin Privileges
                      </span>
                    </div>
                    <p className="text-[11.5px] text-emerald-100/70 mt-0.5 leading-tight">
                      Manage users, view system metrics & broadcast alerts
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-300 text-xs font-semibold group-hover:translate-x-1 transition-transform">
                  <span className="hidden sm:inline">Open</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Section 1: Prayer Settings */}
            <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-4 shadow-xs">
              <div className="flex items-start gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-[#0E543F] flex-shrink-0">
                  <span>🕌</span>
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#14261E]">
                    Prayer Settings
                  </h3>
                  <p className="text-[11px] text-[#65766D]">
                    Set your location and calculation preferences.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#F0EDE5] text-xs">
                {/* Location */}
                <div
                  onClick={onOpenLocation}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-stone-50/60 rounded-lg px-1 transition"
                >
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <MapPin className="w-4 h-4 text-stone-500" />
                    <span className="font-medium">Location</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-500 min-w-0">
                    <span className="font-medium text-[#1E2E25] truncate max-w-[170px]" title={cityName}>
                      {cityName.includes('India') ? cityName : `${cityName}, India`}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                  </div>
                </div>

                {/* Qibla Direction */}
                {onOpenQibla && (
                  <div
                    onClick={onOpenQibla}
                    className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-stone-50/60 rounded-lg px-1 transition"
                  >
                    <div className="flex items-center gap-2.5 text-[#24352D]">
                      <Compass className="w-4 h-4 text-[#0E543F]" />
                      <span className="font-medium">Qibla Direction (قبلہ نما)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-500">
                      <span className="font-semibold text-[#0E543F]">Open Compass</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                )}

                {/* Calculation Method */}
                <div
                  onClick={() => {
                    const methods = [
                      'Muslim World League',
                      'Islamic University, Karachi',
                      'Umm al-Qura University, Makkah',
                      'Egyptian General Authority',
                    ]
                    const currIdx = methods.indexOf(calculationMethod)
                    const nextMethod = methods[(currIdx + 1) % methods.length]
                    onChangeCalculationMethod(nextMethod)
                  }}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-stone-50/60 rounded-lg px-1 transition"
                >
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <Calendar className="w-4 h-4 text-stone-500" />
                    <span className="font-medium">Calculation Method</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-500">
                    <span className="font-medium text-[#1E2E25]">
                      {calculationMethod}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Madhab */}
                <div
                  onClick={() => {
                    onChangeMadhab(madhab === "Shafi'i" ? 'Hanafi' : "Shafi'i")
                  }}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-stone-50/60 rounded-lg px-1 transition"
                >
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <BookOpen className="w-4 h-4 text-stone-500" />
                    <span className="font-medium">Madhab (Asr Juristic Standard)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-500">
                    <span className="font-medium text-[#1E2E25]">
                      {madhab} {madhab === "Shafi'i" ? '(Asr 2:55 PM)' : '(Asr 3:48 PM)'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Prayer Notifications */}
                <div
                  onClick={() => handleUpdatePref('prayerStartEnabled', !currentPrefs.prayerStartEnabled)}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-stone-50/60 rounded-lg px-1 transition"
                >
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <Bell className="w-4 h-4 text-stone-500" />
                    <span className="font-medium">Prayer Start Alerts</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-500">
                    <span
                      className={`font-semibold ${
                        currentPrefs.prayerStartEnabled ? 'text-[#0E543F]' : 'text-stone-400'
                      }`}
                    >
                      {currentPrefs.prayerStartEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Preferences */}
            <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-4 shadow-xs">
              <div className="flex items-start gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-[#0E543F] flex-shrink-0">
                  <span>⚙️</span>
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#14261E]">
                    Preferences
                  </h3>
                  <p className="text-[11px] text-[#65766D]">
                    Set your language and display preferences.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#F0EDE5] text-xs">
                {/* Language */}
                <div className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-stone-50/60 rounded-lg px-1 transition">
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <Globe className="w-4 h-4 text-stone-500" />
                    <span className="font-medium">Language</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-500">
                    <span className="font-medium text-[#1E2E25]">English</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Time Format */}
                <div
                  onClick={() => {
                    onChangeTimeFormat(
                      timeFormat.includes('12') ? '24-hour' : '12-hour (AM/PM)'
                    )
                  }}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-stone-50/60 rounded-lg px-1 transition"
                >
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <Clock className="w-4 h-4 text-stone-500" />
                    <span className="font-medium">Time Format</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-500">
                    <span className="font-medium text-[#1E2E25]">{timeFormat}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (6 cols): Appearance, Daily Reminders, About */}
          <div className="lg:col-span-6 space-y-4">
            {/* Section 3: Appearance */}
            <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-4 shadow-xs">
              <div className="flex items-start gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-[#0E543F] flex-shrink-0">
                  <span>🎨</span>
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#14261E]">
                    Appearance
                  </h3>
                  <p className="text-[11px] text-[#65766D]">
                    Choose your preferred theme.
                  </p>
                </div>
              </div>

              {/* 3 segmented button matching screenshot */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-[#F5F2EA] rounded-2xl">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    theme === 'light'
                      ? 'bg-white text-[#0E543F] shadow-xs border border-emerald-300/80'
                      : 'text-stone-600 hover:text-black'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    theme === 'dark'
                      ? 'bg-white text-[#0E543F] shadow-xs border border-emerald-300/80'
                      : 'text-stone-600 hover:text-black'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    theme === 'system'
                      ? 'bg-white text-[#0E543F] shadow-xs border border-emerald-300/80'
                      : 'text-stone-600 hover:text-black'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>System</span>
                </button>
              </div>
            </div>

            {/* Section 2A: Salah Prayer Reminders (Production System) */}
            <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2.5 mb-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-[#0E543F] flex-shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[#14261E]">
                      Salah Prayer Reminders
                    </h3>
                    <p className="text-[11px] text-[#65766D]">
                      Timely alerts for prayer start and pending windows.
                    </p>
                  </div>
                </div>

                {onSendTestNotification && (
                  <button
                    type="button"
                    onClick={handleTestAlert}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0E543F] text-[10.5px] font-bold border border-emerald-200 transition cursor-pointer flex-shrink-0"
                    title="Send a test notification to verify audio & browser alerts"
                  >
                    Test Alert
                  </button>
                )}
              </div>

              {testStatusMessage && (
                <div className="mb-2 p-2 rounded-xl bg-emerald-50 text-[#0E543F] text-[11px] font-semibold border border-emerald-200 text-center animate-fade-in">
                  {testStatusMessage}
                </div>
              )}

              <div className="divide-y divide-[#F0EDE5] text-xs">
                {/* 1. Prayer-Start Reminders */}
                <div className="py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-[#24352D]">
                      <BellRing className="w-4 h-4 text-emerald-700" />
                      <div>
                        <span className="font-semibold text-[12.5px] block">When Salah Time Begins</span>
                        <span className="text-[10.5px] text-stone-500 block">
                          Reminder with authentic reflection at prayer start.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdatePref('prayerStartEnabled', !currentPrefs.prayerStartEnabled)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                        currentPrefs.prayerStartEnabled ? 'bg-[#0E543F]' : 'bg-stone-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                          currentPrefs.prayerStartEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sub-pills for each of the 5 prayers */}
                  {currentPrefs.prayerStartEnabled && (
                    <div className="mt-2.5 pl-6 pt-1 flex flex-wrap gap-1.5 animate-fade-in">
                      {[
                        { key: 'fajrEnabled', label: 'Fajr' },
                        { key: 'dhuhrEnabled', label: 'Dhuhr' },
                        { key: 'asrEnabled', label: 'Asr' },
                        { key: 'maghribEnabled', label: 'Maghrib' },
                        { key: 'ishaEnabled', label: 'Isha' },
                      ].map(({ key, label }) => {
                        const active = Boolean(currentPrefs[key as keyof NotificationPreferences])
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleUpdatePref(key as keyof NotificationPreferences, !active)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                              active
                                ? 'bg-[#0E543F] text-white border-[#0E543F] shadow-2xs'
                                : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                            }`}
                          >
                            {active ? '✓ ' : ''}{label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 2. 30-Minute Pending Prayer Reminder */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="font-semibold text-[12.5px] block">30-Minute Pending Reminder</span>
                      <span className="text-[10.5px] text-stone-500 block">
                        Gentle alert 30 min before next prayer begins if uncompleted.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdatePref('reminder30MinEnabled', !currentPrefs.reminder30MinEnabled)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                      currentPrefs.reminder30MinEnabled ? 'bg-[#0E543F]' : 'bg-stone-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                        currentPrefs.reminder30MinEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Browser Push Notifications (Background & Lockscreen) */}
                <div className="py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-[#24352D]">
                      <Smartphone className="w-4 h-4 text-emerald-800" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[12.5px]">Browser Push Alerts</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                              browserPermission === 'granted'
                                ? 'bg-emerald-100 text-emerald-800'
                                : browserPermission === 'denied'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {browserPermission === 'granted'
                              ? 'Active'
                              : browserPermission === 'denied'
                              ? 'Blocked in Browser'
                              : 'Permission Needed'}
                          </span>
                        </div>
                        <span className="text-[10.5px] text-stone-500 block">
                          Receive alerts even when the website is closed or in background.
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isPushLoading || browserPermission === 'denied'}
                      onClick={handleTogglePush}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                        currentPrefs.browserPushEnabled ? 'bg-[#0E543F]' : 'bg-stone-300'
                      } ${browserPermission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isPushLoading ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin mx-auto" />
                      ) : (
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                            currentPrefs.browserPushEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      )}
                    </button>
                  </div>

                  {pushStatusMessage && (
                    <p className="mt-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                      {pushStatusMessage}
                    </p>
                  )}
                  {browserPermission === 'denied' && (
                    <p className="mt-1.5 text-[10.5px] text-rose-700 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                      Push notifications are blocked in your browser site permissions. Please allow notifications in your browser address bar.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2B: Daily Reminders */}
            <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-4 shadow-xs">
              <div className="flex items-start gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-[#0E543F] flex-shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#14261E]">
                    Daily Reminders
                  </h3>
                  <p className="text-[11px] text-[#65766D]">
                    Get gentle reminders to stay consistent.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#F0EDE5] text-xs">
                {/* Hadith notification */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <BookOpen className="w-4 h-4 text-stone-500" />
                    <span className="font-medium">Hadith notification</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleReminder('hadith')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      reminders.hadith ? 'bg-[#0E543F]' : 'bg-stone-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                        reminders.hadith ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Quran reminder */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <BookOpen className="w-4 h-4 text-stone-500" />
                    <span className="font-medium">Quran reminder</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleReminder('quran')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      reminders.quran ? 'bg-[#0E543F]' : 'bg-stone-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                        reminders.quran ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Dhikr reminder */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <span className="text-stone-500 text-sm">📿</span>
                    <span className="font-medium">Dhikr reminder</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleReminder('dhikr')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      reminders.dhikr ? 'bg-[#0E543F]' : 'bg-stone-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                        reminders.dhikr ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Daily deeds reminder */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <span className="text-stone-500 text-sm">📋</span>
                    <span className="font-medium">Daily deeds reminder</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleReminder('deeds')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      reminders.deeds ? 'bg-[#0E543F]' : 'bg-stone-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                        reminders.deeds ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Section 5: About */}
            <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-4 shadow-xs">
              <div className="flex items-start gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-[#0E543F] flex-shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#14261E]">About</h3>
                  <p className="text-[11px] text-[#65766D]">
                    Learn more about the app.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#F0EDE5] text-xs">
                <div className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-stone-50/60 rounded-lg px-1 transition">
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <FileText className="w-4 h-4 text-stone-500" />
                    <span className="font-medium">Sources</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </div>

                <div className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-stone-50/60 rounded-lg px-1 transition">
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <Shield className="w-4 h-4 text-stone-500" />
                    <span className="font-medium">Privacy Policy</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </div>

                <div className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-stone-50/60 rounded-lg px-1 transition">
                  <div className="flex items-center gap-2.5 text-[#24352D]">
                    <Info className="w-4 h-4 text-stone-500" />
                    <span className="font-medium">About Salah Companion</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
