import React, { useState, useEffect, useRef } from 'react'
import {
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  KeyRound,
} from 'lucide-react'
import { salahApi, type UserProfile } from '../../services/backendApi'

interface OtpVerificationCardProps {
  email: string
  onSuccess: (user: UserProfile) => void
  onBack?: () => void
  initialExpiresIn?: number
  devOtp?: string
  title?: string
  subtitle?: string
}

export const OtpVerificationCard: React.FC<OtpVerificationCardProps> = ({
  email,
  onSuccess,
  onBack,
  initialExpiresIn = 300,
  devOtp,
  title = 'Verify Your Email',
  subtitle,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutSec, setLockoutSec] = useState<number>(0)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 5-minute OTP countdown timer
  const [expiresIn, setExpiresIn] = useState<number>(initialExpiresIn)

  // 60-second resend cooldown timer
  const [cooldown, setCooldown] = useState<number>(60)
  const [resending, setResending] = useState(false)
  const [resendNotice, setResendNotice] = useState<string | null>(null)

  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  // Expiration countdown
  useEffect(() => {
    if (expiresIn <= 0) return
    const timer = setInterval(() => {
      setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [expiresIn])

  // Resend cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Lockout countdown
  useEffect(() => {
    if (lockoutSec <= 0) {
      if (isLocked) setIsLocked(false)
      return
    }
    const timer = setInterval(() => {
      setLockoutSec((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutSec, isLocked])

  // Auto-focus first input box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Auto-fill dev OTP if present in local dev
  useEffect(() => {
    if (devOtp && devOtp.length === 6 && digits.every((d) => d === '')) {
      const splitDigits = devOtp.split('')
      setDigits(splitDigits)
    }
  }, [devOtp])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleDigitChange = (index: number, val: string) => {
    if (isLocked) return
    setError(null)

    // Handle single digit input
    const cleanVal = val.replace(/\D/g, '')
    if (!cleanVal) {
      const newDigits = [...digits]
      newDigits[index] = ''
      setDigits(newDigits)
      return
    }

    const singleDigit = cleanVal.slice(-1)
    const newDigits = [...digits]
    newDigits[index] = singleDigit
    setDigits(newDigits)

    // Automatically jump to next input
    if (index < 5 && singleDigit) {
      inputRefs.current[index + 1]?.focus()
    }

    // If all 6 digits are filled, auto-submit
    if (index === 5 && singleDigit) {
      const fullOtp = newDigits.join('')
      if (fullOtp.length === 6) {
        verifyCode(fullOtp)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    if (isLocked) return
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const newDigits = [...digits]
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i]
    }
    setDigits(newDigits)

    const focusIndex = Math.min(pasted.length, 5)
    inputRefs.current[focusIndex]?.focus()

    if (pasted.length === 6) {
      verifyCode(pasted)
    }
  }

  const verifyCode = async (otpToVerify?: string) => {
    const code = otpToVerify || digits.join('')
    if (code.length !== 6) {
      setError('Please enter all 6 digits of your verification code.')
      return
    }

    setLoading(true)
    setError(null)
    setResendNotice(null)

    try {
      const res = await salahApi.verifyOtp({
        email: email.trim().toLowerCase(),
        otp: code,
      })

      if (res.user) {
        setSuccess(true)
        setSuccessMessage('✓ Verification successful! May Allah accept your prayers.')
        setTimeout(() => {
          onSuccess(res.user!)
        }, 1000)
      } else {
        setError('Verification succeeded, but could not load profile. Please sign in.')
      }
    } catch (err: any) {
      console.error('[OTP Verify Error]:', err)
      if (err.code === 'OTP_LOCKED') {
        setIsLocked(true)
        setLockoutSec(err.retryAfter || 900)
        setError(err.message || 'Too many incorrect attempts. Please wait 15 minutes before requesting a new code.')
      } else if (err.code === 'OTP_INVALID') {
        setError(err.message || 'Incorrect verification code. Please check your email and try again.')
        if (typeof err.details?.remaining === 'number') {
          setRemainingAttempts(err.details.remaining)
        }
      } else if (err.code === 'OTP_EXPIRED') {
        setError('This verification code has expired (valid for 5 minutes). Please click Resend Code below.')
      } else {
        setError(err.message || 'Verification failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || resending || isLocked) return

    setResending(true)
    setError(null)
    setResendNotice(null)

    try {
      const res = await salahApi.resendOtp(email.trim().toLowerCase())
      setResendNotice(res.message || 'A fresh 6-digit code has been dispatched to your email!')
      setCooldown(60)
      setExpiresIn(res.expiresIn || 300)
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err: any) {
      console.error('[OTP Resend Error]:', err)
      if (err.code === 'RATE_LIMITED') {
        setCooldown(err.retryAfter || 60)
        setError(err.message || `Please wait before requesting another code.`)
      } else if (err.code === 'OTP_LOCKED') {
        setIsLocked(true)
        setLockoutSec(err.retryAfter || 900)
        setError(err.message || 'Temporarily locked due to too many attempts. Please try again later.')
      } else {
        setError(err.message || 'Could not send verification email. Please check your network.')
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full text-center space-y-5 animate-fade-in font-sans">
      {/* Islamic Arch & Mosque Badge Header */}
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0C4535] to-[#07241A] border border-[#B58728]/40 shadow-lg flex items-center justify-center text-amber-300 relative group">
          <KeyRound className="w-8 h-8 transition-transform group-hover:scale-110 duration-200" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#B58728] text-[#07241A] flex items-center justify-center text-[10px] font-bold">
            ✓
          </div>
        </div>

        {/* Bismillah calligraphy header */}
        <p className="mt-3 text-xs font-serif text-[#B58728] tracking-widest uppercase">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>

        <h2 className="mt-1 font-serif font-bold text-2xl text-[#122A20]">
          {title}
        </h2>

        <p className="mt-1.5 text-xs sm:text-sm text-[#5D6F66] max-w-sm mx-auto leading-relaxed">
          {subtitle || (
            <>
              We sent a 6-digit verification code to{' '}
              <strong className="text-[#122A20] font-semibold">{email}</strong>
            </>
          )}
        </p>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0C4535] hover:text-[#B58728] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Wrong email? Change address</span>
          </button>
        )}
      </div>

      {/* 6-Digit Numeric Input Boxes */}
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={loading || success || isLocked}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl border transition-all duration-150 outline-hidden ${
                digit
                  ? 'border-[#0C4535] bg-emerald-50/70 text-[#0C4535] shadow-xs'
                  : 'border-[#D5C9B5] bg-white text-[#122A20] hover:border-[#0C4535]/50'
              } focus:border-[#B58728] focus:ring-2 focus:ring-[#B58728]/30 ${
                isLocked ? 'bg-stone-100 border-stone-300 text-stone-400 cursor-not-allowed' : ''
              }`}
            />
          ))}
        </div>

        {/* 5-minute countdown indicator */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-[#5D6F66]">
          <Clock className="w-3.5 h-3.5 text-[#B58728]" />
          <span>
            {expiresIn > 0 ? (
              <>
                Code valid for{' '}
                <strong className="text-[#122A20] font-semibold">{formatTime(expiresIn)}</strong>
              </>
            ) : (
              <span className="text-rose-600 font-semibold">Code expired. Please request a new code.</span>
            )}
          </span>
        </div>
      </div>

      {/* Error or Alert Feedback */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left flex items-start gap-2.5 animate-fade-in text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
            {remainingAttempts !== null && remainingAttempts > 0 && !isLocked && (
              <p className="text-[11px] text-rose-600 mt-0.5">
                {remainingAttempts} attempt{remainingAttempts === 1 ? '' : 's'} remaining before security lockout.
              </p>
            )}
            {isLocked && lockoutSec > 0 && (
              <p className="text-[11px] text-rose-700 mt-0.5 font-medium">
                Locked for safety. Retry in {formatTime(lockoutSec)}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Resend Notice */}
      {resendNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left flex items-start gap-2.5 animate-fade-in text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="font-medium">{resendNotice}</p>
        </div>
      )}

      {/* Success Feedback */}
      {success && (
        <div className="p-3.5 bg-[#0C4535] border border-emerald-600 rounded-xl text-amber-200 text-xs flex items-center justify-center gap-2 animate-fade-in shadow-md">
          <CheckCircle2 className="w-4 h-4 text-amber-300" />
          <span className="font-semibold">{successMessage || 'Verification successful!'}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-1">
        <button
          type="button"
          onClick={() => verifyCode()}
          disabled={loading || success || digits.join('').length !== 6 || isLocked}
          className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-md cursor-pointer ${
            success
              ? 'bg-emerald-600 text-white border border-emerald-500'
              : digits.join('').length === 6 && !loading && !isLocked
              ? 'bg-[#0C4535] hover:bg-[#0A3B2D] text-amber-300 border border-amber-400/40 hover:shadow-lg active:scale-[0.99]'
              : 'bg-stone-200 text-stone-500 border border-stone-300 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
              <span>Verifying Code...</span>
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Verified! Launching Dashboard...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>Verify &amp; Continue</span>
            </>
          )}
        </button>

        {/* Resend Code Button with Cooldown */}
        <div className="pt-2 flex flex-col items-center gap-1.5 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending || isLocked}
            className={`text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              cooldown > 0 || resending || isLocked
                ? 'text-stone-400 cursor-not-allowed'
                : 'text-[#0C4535] hover:text-[#B58728] underline cursor-pointer'
            }`}
          >
            {resending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sending fresh code...</span>
              </>
            ) : cooldown > 0 ? (
              <span>Resend code in {cooldown}s</span>
            ) : (
              <span>Didn't receive code? Resend 6-Digit Code</span>
            )}
          </button>

          <p className="text-[11px] text-[#7A8B82] leading-tight">
            Check your <strong>Spam</strong> or <strong>Promotions</strong> folder if not found in primary inbox.
          </p>
        </div>
      </div>

      {/* Islamic Hadith/Quran Verse Card Footer */}
      <div className="pt-3 border-t border-[#E8DFC2] text-left">
        <p className="text-[11px] text-[#4E6258] italic leading-relaxed text-center">
          « إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا »
        </p>
        <p className="text-[10px] text-[#7A8B82] text-center mt-0.5">
          "Indeed, prayer has been decreed upon the believers a decree of specified times." (Surah An-Nisa 4:103)
        </p>
      </div>
    </div>
  )
}
