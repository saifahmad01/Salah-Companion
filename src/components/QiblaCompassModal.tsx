import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Compass,
  MapPin,
  CheckCircle2,
  HelpCircle,
  Smartphone,
  Navigation,
  AlertTriangle,
  LocateFixed,
  RotateCw,
  ShieldAlert,
} from 'lucide-react'
import {
  calculateQiblaBearing,
  calculateDistanceToKaabaKm,
  getCardinalDirection,
  isHeadingAligned,
  getTurnAngle,
  smoothHeadingEMA,
  updateContinuousHeading,
} from '../utils/qibla'

interface QiblaCompassModalProps {
  isOpen: boolean
  onClose: () => void
  latitude: number
  longitude: number
  cityName: string
  onDetectGPS?: () => Promise<void>
  onOpenLocationModal?: () => void
}

export const QiblaCompassModal: React.FC<QiblaCompassModalProps> = ({
  isOpen,
  onClose,
  latitude,
  longitude,
  cityName,
  onDetectGPS,
  onOpenLocationModal,
}) => {
  // Device heading in degrees (0 = North, 90 = East, 180 = South, 270 = West)
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null)
  const [hasOrientationSensor, setHasOrientationSensor] = useState<boolean | null>(null)
  const [sensorPermissionNeeded, setSensorPermissionNeeded] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [isCalibrated, setIsCalibrated] = useState<boolean>(true)
  const [isNonSecureContext, setIsNonSecureContext] = useState<boolean>(false)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Continuous smoothed rotation angle to prevent 359° <-> 0° jumping spins in CSS transitions
  const [continuousHeading, setContinuousHeading] = useState<number>(0)
  const lastRawHeadingRef = useRef<number | null>(null)
  const continuousHeadingRef = useRef<number>(0)
  const lastVibratedRef = useRef<number>(0)
  const sensorTimeoutRef = useRef<any>(null)

  // Precise mathematical calculations to Kaaba (21.4225° N, 39.8262° E)
  const qiblaBearing = calculateQiblaBearing(latitude, longitude)
  const distanceKm = calculateDistanceToKaabaKm(latitude, longitude)
  const qiblaCardinal = getCardinalDirection(qiblaBearing)

  // STRICT REQUIREMENT: Only claim aligned when reliable device sensor is actively reporting AND calibrated
  const isSensorActive = hasOrientationSensor === true && deviceHeading !== null
  const isAligned =
    isSensorActive && isCalibrated
      ? isHeadingAligned(deviceHeading, qiblaBearing, 3)
      : false
  const turnAngle = isSensorActive ? getTurnAngle(deviceHeading, qiblaBearing) : 0

  // Update unwrapped heading smoothly with EMA anti-jitter filter
  const updateSmoothedHeading = (rawHeading: number) => {
    // 1. Continuous unwrapped heading with circular EMA to prevent 360-degree spin glitch
    if (lastRawHeadingRef.current === null) {
      lastRawHeadingRef.current = rawHeading
      continuousHeadingRef.current = rawHeading
      setContinuousHeading(rawHeading)
      setDeviceHeading(rawHeading)
    } else {
      const nextContinuous = updateContinuousHeading(
        continuousHeadingRef.current,
        rawHeading,
        0.22,
        0.25
      )
      continuousHeadingRef.current = nextContinuous
      lastRawHeadingRef.current = rawHeading
      setContinuousHeading(nextContinuous)

      // 2. Smoothed 0-360 heading for numeric display & alignment checks
      setDeviceHeading((prev) => smoothHeadingEMA(prev, rawHeading, 0.22, 0.25))
    }
  }

  // Request iOS Safari DeviceOrientation permission
  const requestIOSPermission = async () => {
    try {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        const response = await (DeviceOrientationEvent as any).requestPermission()
        if (response === 'granted') {
          setPermissionDenied(false)
          setSensorPermissionNeeded(false)
          startOrientationListener()
        } else {
          setPermissionDenied(true)
          setHasOrientationSensor(false)
          setSensorPermissionNeeded(false)
        }
      }
    } catch {
      setPermissionDenied(true)
      setHasOrientationSensor(false)
      setSensorPermissionNeeded(false)
    }
  }

  const startOrientationListener = () => {
    // 1. Secure context check: Device orientation sensors are restricted by modern browsers on insecure HTTP
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setIsNonSecureContext(true)
      setHasOrientationSensor(false)
      return () => {}
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null

      // Check iOS compass calibration accuracy
      if (typeof (e as any).webkitCompassAccuracy === 'number') {
        const accuracy = (e as any).webkitCompassAccuracy
        // Negative accuracy means magnetometer is uncalibrated
        setIsCalibrated(accuracy >= 0)
      } else {
        setIsCalibrated(true)
      }

      // Screen rotation adjustment (e.g. landscape mode)
      const screenAngle =
        (typeof window !== 'undefined' &&
          (window.screen?.orientation?.angle ??
            (typeof (window as any).orientation === 'number'
              ? (window as any).orientation
              : 0))) ||
        0

      // 1. iOS Safari WebKit compass heading (True North / Magnetic North)
      if (typeof (e as any).webkitCompassHeading === 'number') {
        heading = ((e as any).webkitCompassHeading + screenAngle) % 360
      } else if (e.alpha !== null && typeof e.alpha === 'number') {
        // 2. Android Chrome / Standard W3C Device Orientation
        // alpha measures angle counter-clockwise around z-axis, so heading from North is 360 - alpha
        heading = (360 - e.alpha + screenAngle) % 360
      }

      if (heading !== null && !isNaN(heading)) {
        if (sensorTimeoutRef.current) {
          clearTimeout(sensorTimeoutRef.current)
          sensorTimeoutRef.current = null
        }
        setHasOrientationSensor(true)
        updateSmoothedHeading(heading)
      }
    }

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        setSensorPermissionNeeded(true)
      } else {
        // Prefer deviceorientationabsolute on Android Chrome for True North geomagnetic orientation
        if ('ondeviceorientationabsolute' in window) {
          window.addEventListener('deviceorientationabsolute', handleOrientation as any, true)
        }
        window.addEventListener('deviceorientation', handleOrientation, true)

        // Set timeout: if no orientation sensor event reports within 1500ms, mark sensor as unavailable
        sensorTimeoutRef.current = setTimeout(() => {
          if (lastRawHeadingRef.current === null) {
            setHasOrientationSensor(false)
          }
        }, 1500)
      }
    } else {
      setHasOrientationSensor(false)
    }

    return () => {
      if (sensorTimeoutRef.current) {
        clearTimeout(sensorTimeoutRef.current)
      }
      if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute', handleOrientation as any, true)
      }
      window.removeEventListener('deviceorientation', handleOrientation, true)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    lastRawHeadingRef.current = null
    continuousHeadingRef.current = 0
    setContinuousHeading(0)
    setDeviceHeading(null)
    setHasOrientationSensor(null)
    setPermissionDenied(false)
    setIsCalibrated(true)
    setIsNonSecureContext(false)
    setLocationError(null)

    const cleanup = startOrientationListener()
    return () => {
      if (cleanup) cleanup()
    }
  }, [isOpen])

  // Gentle haptic feedback when device aligns within +/- 3 degrees of Kaaba
  useEffect(() => {
    if (isAligned && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const now = Date.now()
      if (now - lastVibratedRef.current > 1800) {
        try {
          navigator.vibrate(50)
          lastVibratedRef.current = now
        } catch {}
      }
    }
  }, [isAligned])

  const handleTriggerGPS = async () => {
    if (onDetectGPS) {
      setIsDetectingLocation(true)
      setLocationError(null)
      try {
        await onDetectGPS()
      } catch (err: any) {
        setLocationError(err?.message || 'Could not determine GPS coordinates.')
      } finally {
        setIsDetectingLocation(false)
      }
    }
  }

  const handleRetrySensor = () => {
    lastRawHeadingRef.current = null
    continuousHeadingRef.current = 0
    setContinuousHeading(0)
    setDeviceHeading(null)
    setHasOrientationSensor(null)
    setPermissionDenied(false)
    startOrientationListener()
  }

  if (!isOpen) return null

  // The compass dial rotates counter to device heading so True North (0°) always points towards geographic North
  const dialRotation = isSensorActive ? -continuousHeading : 0

  // Kaaba needle rotates to point directly towards Kaaba angle relative to the phone's top
  const needleRotation = isSensorActive
    ? qiblaBearing - continuousHeading
    : qiblaBearing

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qibla-compass-title"
    >
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
              <h3 id="qibla-compass-title" className="text-[17px] font-bold text-[#14261E] leading-tight">
                Qibla Compass (قبلہ نما)
              </h3>
              <p className="text-[11px] text-[#55675D]">
                Accurate direction to the Holy Kaaba, Makkah
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
              <MapPin className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
              <span className="truncate max-w-[170px] font-semibold">{cityName}</span>
              {onOpenLocationModal && (
                <button
                  type="button"
                  onClick={onOpenLocationModal}
                  className="text-[10px] underline text-emerald-300 hover:text-white ml-1 cursor-pointer"
                >
                  Change
                </button>
              )}
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
            {onDetectGPS && (
              <button
                type="button"
                onClick={handleTriggerGPS}
                disabled={isDetectingLocation}
                className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/25 text-[10px] text-emerald-100 font-medium transition cursor-pointer disabled:opacity-50"
              >
                <LocateFixed className="w-2.5 h-2.5" />
                <span>{isDetectingLocation ? 'Locating...' : 'Use GPS'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Location Error Notice */}
        {locationError && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{locationError}</span>
          </div>
        )}

        {/* HTTPS Requirement Warning */}
        {isNonSecureContext && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5 animate-fade-in">
            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-[11.5px] leading-snug">
              <span className="font-bold">HTTPS Required for Sensors: </span>
              Modern browsers restrict orientation sensors to secure HTTPS origins. Please use HTTPS or follow the manual direction guide below.
            </div>
          </div>
        )}

        {/* iOS Permission Request Banner */}
        {sensorPermissionNeeded && !isNonSecureContext && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-[11.5px] font-medium leading-tight">
                Tap to enable device orientation sensor for live compass rotation.
              </span>
            </div>
            <button
              type="button"
              onClick={requestIOSPermission}
              className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] cursor-pointer flex-shrink-0 transition active:scale-95"
            >
              Enable Sensor
            </button>
          </div>
        )}

        {/* Permission Denied Notice */}
        {permissionDenied && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-[11px]">Sensor permission denied. Using manual fallback below.</span>
            </div>
            <button
              type="button"
              onClick={handleRetrySensor}
              className="text-[10px] underline font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className="w-2.5 h-2.5" />
              Retry
            </button>
          </div>
        )}

        {/* Sensor Calibration Banner if magnetometer is uncalibrated */}
        {isSensorActive && !isCalibrated && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 animate-pulse">
            <RotateCw className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-[11px] font-medium leading-tight">
              Sensor uncalibrated: Gently wave your phone in a figure-8 motion to calibrate the compass.
            </span>
          </div>
        )}

        {/* Live Alignment & Feedback Banner */}
        <div className="mt-3">
          {isSensorActive ? (
            isAligned ? (
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
            )
          ) : (
            /* Sensor Unavailable Fallback State */
            <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200/90 text-stone-700 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-stone-500 flex-shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-stone-800">Manual Mode: </span>
                  Face True North, then turn <strong>{qiblaBearing}° ({qiblaCardinal})</strong> towards the Kaaba.
                </div>
              </div>
              <button
                type="button"
                onClick={handleRetrySensor}
                className="px-2 py-1 rounded-md bg-stone-200 hover:bg-stone-300 text-stone-800 text-[10px] font-semibold flex items-center gap-1 cursor-pointer flex-shrink-0"
                title="Retry orientation sensors"
              >
                <RotateCw className="w-2.5 h-2.5" />
                Detect
              </button>
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
            {/* Compass Rim / Outer Dial (rotates smoothly counter to device heading) */}
            <div
              className="absolute inset-0 rounded-full transition-transform duration-200 ease-out flex items-center justify-center"
              style={{
                transform: `rotate(${dialRotation}deg)`,
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

                {/* Kaaba Pin Marker on the Dial */}
                <g transform={`rotate(${qiblaBearing} 150 150)`}>
                  <circle
                    cx="150"
                    cy="24"
                    r="9"
                    fill="#D4AF37"
                    className="opacity-90 animate-pulse"
                  />
                  {/* Miniature Kaaba Cube */}
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
                  {/* Golden Kiswah Band */}
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

            {/* Central Pointer Needle (points toward Kaaba) */}
            <div
              className="absolute w-full h-full pointer-events-none flex items-center justify-center transition-transform duration-200 ease-out"
              style={{
                transform: `rotate(${needleRotation}deg)`,
              }}
            >
              {/* Top pointer needle */}
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

              {/* Center Pivot */}
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-md z-10 ${
                  isAligned
                    ? 'bg-emerald-600 border-amber-300 text-white ring-2 ring-emerald-400'
                    : 'bg-[#0C4535] border-[#F5DC96] text-amber-200'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-white" />
              </div>

              {/* Bottom counterweight */}
              <div className="absolute bottom-6 flex flex-col items-center opacity-40">
                <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[34px] border-t-stone-400" />
              </div>
            </div>

            {/* Fixed Top Phone Heading Indicator (Device reference point) */}
            <div className="absolute -top-3 w-3 h-3 bg-red-600 rotate-45 rounded-2xs shadow-xs pointer-events-none" />
          </div>

          {/* Heading & Qibla Status Bar */}
          <div className="mt-3 flex items-center gap-2 text-xs text-[#55675D]">
            <span className="font-mono font-semibold">
              {isSensorActive
                ? `Heading: ${Math.round(deviceHeading)}° ${getCardinalDirection(deviceHeading)}`
                : 'Sensor: Manual / Desktop'}
            </span>
            <span>•</span>
            <span className="font-semibold text-emerald-900">
              Qibla: {qiblaBearing}° {qiblaCardinal}
            </span>
          </div>

          {/* Orientation Guidance Notes & Manual Fallback Instructions */}
          <div className="mt-3.5 w-full p-3 rounded-2xl bg-white border border-[#E8E2D5] text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#0C4535]">
              <Compass className="w-3.5 h-3.5" />
              <span>How to Face the Qibla</span>
            </div>
            {isSensorActive ? (
              <ul className="text-[11px] text-[#55675D] space-y-1 pl-4 list-disc leading-tight">
                <li>Hold your phone flat and parallel to the ground away from metal objects or laptops.</li>
                <li>Rotate your body until the top needle points straight up and turns <strong>bright green</strong>.</li>
                <li>When aligned, the Kaaba banner indicates your prayer direction is verified.</li>
              </ul>
            ) : (
              <div className="text-[11px] text-[#55675D] space-y-1 leading-snug">
                <p>
                  1. Determine <strong>True North (0°)</strong> using an external compass, the morning sun (East), or evening sun (West).
                </p>
                <p>
                  2. Turn clockwise to <strong>{qiblaBearing}° ({qiblaCardinal})</strong>.
                </p>
                <p>
                  3. You are now facing the Holy Kaaba in Makkah Al-Mukarramah ({distanceKm.toLocaleString()} km away).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
