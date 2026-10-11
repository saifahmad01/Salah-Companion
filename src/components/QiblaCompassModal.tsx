import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Compass,
  MapPin,
  RotateCw,
  CheckCircle2,
  HelpCircle,
  Smartphone,
  Navigation,
} from 'lucide-react'
import {
  calculateQiblaBearing,
  calculateDistanceToKaabaKm,
  getCardinalDirection,
  isHeadingAligned,
  getTurnAngle,
} from '../utils/qibla'

interface QiblaCompassModalProps {
  isOpen: boolean
  onClose: () => void
  latitude: number
  longitude: number
  cityName: string
}

export const QiblaCompassModal: React.FC<QiblaCompassModalProps> = ({
  isOpen,
  onClose,
  latitude,
  longitude,
  cityName,
}) => {
  // Device heading in degrees (0 = North, 90 = East, etc.)
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null)
  const [hasOrientationSensor, setHasOrientationSensor] = useState<boolean | null>(null)
  const [sensorPermissionNeeded, setSensorPermissionNeeded] = useState(false)
  const [manualHeading, setManualHeading] = useState(0) // For desktop simulation
  const lastVibratedRef = useRef<number>(0)

  // Calculations
  const qiblaBearing = calculateQiblaBearing(latitude, longitude)
  const distanceKm = calculateDistanceToKaabaKm(latitude, longitude)
  const qiblaCardinal = getCardinalDirection(qiblaBearing)

  // Active heading: device heading if available, else desktop manual
  const effectiveHeading = deviceHeading !== null ? deviceHeading : manualHeading
  const isAligned = isHeadingAligned(effectiveHeading, qiblaBearing, 3)
  const turnAngle = getTurnAngle(effectiveHeading, qiblaBearing)

  // Request iOS permission if required
  const requestIOSPermission = async () => {
    try {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        const response = await (DeviceOrientationEvent as any).requestPermission()
        if (response === 'granted') {
          setSensorPermissionNeeded(false)
          startOrientationListener()
        } else {
          setHasOrientationSensor(false)
        }
      }
    } catch {
      setHasOrientationSensor(false)
    }
  }

  const startOrientationListener = () => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null

      // iOS WebKit compass heading (authoritative True North / Magnetic North)
      if (typeof (e as any).webkitCompassHeading === 'number') {
        heading = (e as any).webkitCompassHeading
      } else if (e.alpha !== null && typeof e.alpha === 'number') {
        // Android / Standard W3C Device Orientation (alpha 0-360)
        // Check for absolute flag
        if ((e as any).absolute) {
          heading = 360 - e.alpha
        } else {
          heading = 360 - e.alpha
        }
      }

      if (heading !== null) {
        setHasOrientationSensor(true)
        setDeviceHeading(Math.round(heading * 10) / 10)
      }
    }

    if (window.DeviceOrientationEvent) {
      // Check iOS permission check first
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        setSensorPermissionNeeded(true)
      } else {
        window.addEventListener('deviceorientationabsolute', handleOrientation as any, true)
        window.addEventListener('deviceorientation', handleOrientation, true)
      }
    } else {
      setHasOrientationSensor(false)
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as any, true)
      window.removeEventListener('deviceorientation', handleOrientation, true)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    const cleanup = startOrientationListener()
    return () => {
      if (cleanup) cleanup()
    }
  }, [isOpen])

  // Haptic feedback upon perfect alignment
  useEffect(() => {
    if (isAligned && 'vibrate' in navigator) {
      const now = Date.now()
      if (now - lastVibratedRef.current > 1500) {
        try {
          navigator.vibrate(60)
          lastVibratedRef.current = now
        } catch {}
      }
    }
  }, [isAligned])

  if (!isOpen) return null

  // The compass dial rotates counter to device heading so True North always points to real North
  // Kaaba needle angle relative to dial = qiblaBearing
  // Needle visual rotation relative to phone screen = (qiblaBearing - effectiveHeading + 360) % 360
  const needleRotation = (qiblaBearing - effectiveHeading + 360) % 360

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div
        className="relative w-full max-w-[440px] bg-[#FAF8F3] rounded-[28px] max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200/80 p-5 sm:p-6 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E8E2D5]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[#0C4535]">
              <Compass className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[#14261E] leading-tight">
                Qibla Compass (قبلہ نما)
              </h3>
              <p className="text-[11px] text-[#55675D]">
                Accurate direction to Kaaba, Makkah
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close compass"
            className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Location & Bearing Summary Bar */}
        <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-[#0C4535] to-[#082E22] text-white flex items-center justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-200 font-medium">
              <MapPin className="w-3.5 h-3.5 text-emerald-300" />
              <span className="truncate max-w-[190px]">{cityName}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-[#F5DC96] tracking-tight">
                {qiblaBearing}°
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded-md">
                {qiblaCardinal}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-emerald-200 uppercase tracking-wider block">
              Distance to Kaaba
            </span>
            <span className="text-sm font-bold font-mono text-white">
              {distanceKm.toLocaleString()} km
            </span>
          </div>
        </div>

        {/* iOS Permission Banner if needed */}
        {sensorPermissionNeeded && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Allow compass sensor access for live rotation.</span>
            </div>
            <button
              type="button"
              onClick={requestIOSPermission}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] cursor-pointer flex-shrink-0"
            >
              Enable
            </button>
          </div>
        )}

        {/* Alignment Feedback Banner */}
        <div className="mt-3">
          {isAligned ? (
            <div className="p-2.5 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-900 flex items-center justify-center gap-2 shadow-xs animate-pulse">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="text-xs font-black tracking-wide text-emerald-800 uppercase">
                Facing the Kaaba! (قبلہ کی سمت درست ہے)
              </span>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-stone-100/90 border border-stone-200 text-stone-700 flex items-center justify-center gap-2 text-xs">
              <Navigation
                className="w-4 h-4 text-[#0E543F] transition-transform duration-300"
                style={{ transform: `rotate(${turnAngle}deg)` }}
              />
              <span className="font-semibold text-[11.5px]">
                {turnAngle > 0
                  ? `Turn right by ${Math.abs(turnAngle)}° to face Qibla`
                  : `Turn left by ${Math.abs(turnAngle)}° to face Qibla`}
              </span>
            </div>
          )}
        </div>

        {/* Compass Dial Visual */}
        <div className="mt-4 flex flex-col items-center justify-center">
          <div
            className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-full transition-all duration-300 flex items-center justify-center ${
              isAligned
                ? 'shadow-[0_0_35px_rgba(16,185,129,0.45)] ring-4 ring-emerald-500/80 bg-gradient-to-br from-white via-emerald-50/30 to-amber-50/20'
                : 'shadow-lg border-4 border-[#0E4737]/20 bg-white'
            }`}
          >
            {/* Compass Rim / Outer Dial (rotates with device heading) */}
            <div
              className="absolute inset-0 rounded-full transition-transform duration-200 ease-out flex items-center justify-center"
              style={{
                transform: `rotate(${-effectiveHeading}deg)`,
              }}
            >
              {/* Outer Graduation Ring */}
              <svg className="w-full h-full p-2 select-none" viewBox="0 0 300 300">
                {/* Degree ticks */}
                {Array.from({ length: 72 }).map((_, i) => {
                  const deg = i * 5
                  const isMajor = deg % 30 === 0
                  const isCardinal = deg % 90 === 0
                  const length = isCardinal ? 14 : isMajor ? 10 : 5
                  const strokeWidth = isCardinal ? 2.5 : isMajor ? 1.8 : 0.8
                  const strokeColor = isCardinal
                    ? deg === 0
                      ? '#DC2626'
                      : '#0C4535'
                    : isMajor
                    ? '#55675D'
                    : '#CBD5E1'

                  return (
                    <line
                      key={deg}
                      x1="150"
                      y1="8"
                      x2="150"
                      y2={8 + length}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      transform={`rotate(${deg} 150 150)`}
                    />
                  )
                })}

                {/* Major Degree Numbers */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                  const rad = ((deg - 90) * Math.PI) / 180
                  const r = 115
                  const x = 150 + r * Math.cos(rad)
                  const y = 150 + r * Math.sin(rad)
                  return (
                    <text
                      key={deg}
                      x={x}
                      y={y}
                      fill="#8F9F95"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {deg}
                    </text>
                  )
                })}

                {/* Cardinal Points */}
                <text
                  x="150"
                  y="36"
                  fill="#DC2626"
                  fontSize="15"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  N
                </text>
                <text
                  x="264"
                  y="150"
                  fill="#0C4535"
                  fontSize="13"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  E
                </text>
                <text
                  x="150"
                  y="264"
                  fill="#0C4535"
                  fontSize="13"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  S
                </text>
                <text
                  x="36"
                  y="150"
                  fill="#0C4535"
                  fontSize="13"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  W
                </text>

                {/* Kaaba Marker Pin on the Dial */}
                <g transform={`rotate(${qiblaBearing} 150 150)`}>
                  {/* Glowing beacon for Kaaba angle */}
                  <circle
                    cx="150"
                    cy="24"
                    r="9"
                    fill="#D4AF37"
                    className="opacity-90 animate-pulse"
                  />
                  <rect
                    x="144"
                    y="18"
                    width="12"
                    height="12"
                    rx="2"
                    fill="#1C1917"
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="144"
                    y1="22"
                    x2="156"
                    y2="22"
                    stroke="#F59E0B"
                    strokeWidth="1"
                  />
                </g>
              </svg>
            </div>

            {/* Needle pointing to Kaaba (centered) */}
            <div
              className="absolute w-full h-full pointer-events-none flex items-center justify-center transition-transform duration-300 ease-out"
              style={{
                transform: `rotate(${needleRotation}deg)`,
              }}
            >
              {/* Top pointer (towards Kaaba) */}
              <div className="absolute top-5 flex flex-col items-center">
                <div
                  className={`w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[44px] transition-colors ${
                    isAligned ? 'border-b-[#10B981]' : 'border-b-[#0C4535]'
                  }`}
                />
                <span className="text-[10px] font-black tracking-wider uppercase text-[#0C4535] bg-[#F5DC96] px-1.5 py-0.2 rounded-md shadow-2xs mt-0.5">
                  KAABA
                </span>
              </div>

              {/* Center Compass Rose Pivot */}
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-md z-10 ${
                  isAligned
                    ? 'bg-emerald-600 border-amber-300 text-white ring-2 ring-emerald-400'
                    : 'bg-[#0C4535] border-[#F5DC96] text-amber-200'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-white" />
              </div>

              {/* Bottom pointer (counter-balance) */}
              <div className="absolute bottom-6 flex flex-col items-center opacity-40">
                <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[34px] border-t-stone-400" />
              </div>
            </div>

            {/* Fixed Top Phone Heading Indicator */}
            <div className="absolute -top-3 w-3 h-3 bg-red-600 rotate-45 rounded-2xs shadow-xs pointer-events-none" />
          </div>

          {/* Current Heading & Mode Status */}
          <div className="mt-3 flex items-center gap-2 text-xs text-[#55675D]">
            <span className="font-mono font-semibold">
              Heading: {Math.round(effectiveHeading)}° {getCardinalDirection(effectiveHeading)}
            </span>
            <span>•</span>
            <span>Qibla: {qiblaBearing}° {qiblaCardinal}</span>
          </div>

          {/* Desktop Simulation Mode Controls */}
          {hasOrientationSensor === false && (
            <div className="mt-3 w-full p-3 rounded-2xl bg-white border border-[#E8E2D5] text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-[#0C4535] flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-stone-500" />
                  Manual Heading (Desktop Mode)
                </span>
                <span className="font-mono font-bold text-[#14261E]">
                  {manualHeading}°
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="359"
                value={manualHeading}
                onChange={(e) => setManualHeading(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#0C4535]"
              />
              <p className="text-[10px] text-stone-500 mt-1 leading-tight">
                Tip: Rotate to simulate turning your body or laptop towards {qiblaBearing}° {qiblaCardinal}.
              </p>
            </div>
          )}
        </div>

        {/* Quranic Ayah & Instructions */}
        <div className="mt-4 p-3.5 rounded-2xl bg-white border border-[#EDE8DC] space-y-2">
          <div className="text-center">
            <p className="font-arabic text-sm text-[#0C4535] leading-loose font-bold" dir="rtl">
              فَوَلِّ وَجْهَكَ شَطْرَ الْمَسْجِدِ الْحَرَامِ ۚ وَحَيْثُ مَا كُنتُمْ فَوَلُّوا وُجُوهَكُمْ شَطْرَهُ
            </p>
            <p className="text-[11px] text-[#4E6056] mt-1 leading-snug">
              “So turn your face toward al-Masjid al-Haram. And wherever you [believers] are, turn your faces toward it in prayer.”
            </p>
            <span className="text-[9.5px] font-semibold text-[#0E543F] mt-0.5 block">
              Surah Al-Baqarah (2:144)
            </span>
          </div>

          {/* Calibration Tip */}
          <div className="pt-2 border-t border-stone-100 flex items-start gap-2 text-[10.5px] text-stone-600">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="leading-tight">
              Hold device flat away from metallic objects or laptops. Move phone in a figure-8 motion if accuracy seems offset.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
