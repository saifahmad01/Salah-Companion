import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  LogOut,
  MapPin,
  Shield,
  CheckCircle2,
  AlertCircle,
  X,
  Compass,
  Mail,
} from 'lucide-react'
import { salahApi, type UserProfile } from '../services/backendApi'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserProfile | null
  onAuthSuccess: (user: UserProfile) => void
  onLogout: () => void
  currentCoords?: { lat: number; lng: number }
  currentCityName?: string
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onAuthSuccess,
  onLogout,
  currentCoords,
  currentCityName,
}) => {
  const navigate = useNavigate()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Edit profile state for logged-in user
  const [editName, setEditName] = useState(user?.name || '')
  const [editMethod, setEditMethod] = useState(user?.prayerCalculationMethod || 'Karachi')
  const [isUpdating, setIsUpdating] = useState(false)

  // Sync edit fields when user changes
  React.useEffect(() => {
    if (user) {
      setEditName(user.name)
      setEditMethod(user.prayerCalculationMethod || 'Karachi')
    }
  }, [user])

  if (!isOpen) return null

  const handleGoogleLogin = () => {
    setGoogleLoading(true)
    window.location.href = salahApi.getGoogleOAuthUrl()
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await salahApi.updateProfile({
        name: editName.trim(),
        prayerCalculationMethod: editMethod,
        latitude: currentCoords?.lat,
        longitude: currentCoords?.lng,
      })
      if (res?.user) {
        onAuthSuccess(res.user)
        setSuccessMessage('Profile and prayer settings updated.')
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#FAF8F2] border border-[#E6E0D2] shadow-2xl p-5 sm:p-6 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[#EBE5D8]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0C4535] flex items-center justify-center text-amber-300 font-serif font-bold text-xs shadow-2xs">
              🕌
            </div>
            <div>
              <span className="text-sm font-bold text-[#14261E] block leading-tight">
                {user ? 'My Profile' : 'Sign in to Salah Companion'}
              </span>
              <span className="text-[10px] text-stone-500 font-sans tracking-wide">
                {user ? 'Prayer Settings & Account' : 'Sync prayers and daily tracking'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success / Error Banners */}
        {errorMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* LOGGED IN USER PROFILE */}
        {user ? (
          <div className="space-y-3.5">
            <div className="p-3 rounded-2xl bg-white border border-[#E8E2D4] flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-[#0E543F] font-bold text-sm">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-[#14261E] block">
                    {user.name}
                  </span>
                  <span className="text-[11px] text-stone-500 block truncate max-w-[170px]">
                    {user.email}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" />
                      <span>Google Account</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile update form */}
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#1F3329] uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#DDD7C8] text-xs text-[#14261E] focus:outline-none focus:border-[#0E543F]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#1F3329] uppercase tracking-wider block mb-1">
                  Calculation Method
                </label>
                <div className="relative">
                  <Compass className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                  <select
                    value={editMethod}
                    onChange={(e) => setEditMethod(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#DDD7C8] text-xs text-[#14261E] focus:outline-none focus:border-[#0E543F]"
                  >
                    <option value="Karachi">University of Islamic Sciences, Karachi</option>
                    <option value="MWL">Muslim World League (MWL)</option>
                    <option value="ISNA">Islamic Society of North America (ISNA)</option>
                    <option value="Egypt">Egyptian General Authority of Survey</option>
                    <option value="Makkah">Umm al-Qura University, Makkah</option>
                    <option value="Dubai">Dubai Official Calculation</option>
                  </select>
                </div>
              </div>

              {/* Location Badge */}
              <div className="p-2.5 rounded-xl bg-[#F4F1E8] border border-[#E4DDD0] text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0E543F]" />
                  <span className="text-[11.5px] font-medium text-[#25392F]">
                    {currentCityName || 'Location GPS'}
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 font-mono">
                  {currentCoords ? `${currentCoords.lat.toFixed(2)}°, ${currentCoords.lng.toFixed(2)}°` : 'Default GPS'}
                </span>
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full py-2.5 rounded-xl bg-[#0C4535] hover:bg-[#082F24] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? 'Saving Changes...' : 'Save Settings'}
              </button>
            </form>

            {/* Logout button */}
            <div className="pt-2 border-t border-[#EAE4D6]">
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* LOGGED OUT: GOOGLE SIGN-IN */
          <div className="py-2 space-y-4">
            <div className="text-center py-2">
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                Sign in with your Google account to track your daily prayers, record deeds, and sync progress seamlessly.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/login')
              }}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#F0D69A] via-[#E5C67F] to-[#D5AF5E] hover:brightness-105 text-[#14291F] font-bold text-xs sm:text-sm shadow-xs transition active:scale-[0.99] cursor-pointer"
            >
              <Mail className="w-4 h-4 text-[#14291F]" />
              <span>Sign In with Email OTP</span>
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-semibold text-xs shadow-xs hover:shadow-sm transition active:scale-[0.99] cursor-pointer disabled:opacity-75"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-emerald-700/30 border-t-emerald-800 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <div className="pt-1 text-center">
              <span className="text-[10px] text-stone-500">
                🔒 Secure Brevo OTP & Google Sign-In • No password required
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthModal
