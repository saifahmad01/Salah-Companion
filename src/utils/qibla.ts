/**
 * Islamic Qibla Direction & Distance Calculations
 * Based on authentic spherical trigonometry (Great Circle Azimuth) to the Holy Kaaba in Makkah Al-Mukarramah.
 */

// Authoritative coordinates of the Holy Kaaba (Masjid al-Haram, Makkah Al-Mukarramah)
// Latitude: 21.422487° N (21° 25' 21" N), Longitude: 39.826206° E (39° 49' 34" E)
export const KAABA_COORDINATES = {
  latitude: 21.422487,
  longitude: 39.826206,
  name: 'Holy Kaaba, Makkah Al-Mukarramah',
}

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI
const EARTH_RADIUS_KM = 6371.0088

/**
 * Validates geographic coordinates
 */
export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    isFinite(latitude) &&
    isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

/**
 * Normalizes any angle to standard [0, 360) range
 */
export function normalizeAngle(degrees: number): number {
  if (isNaN(degrees) || !isFinite(degrees)) return 0
  return ((degrees % 360) + 360) % 360
}

/**
 * Calculates the shortest signed angular difference from one angle to another (-180° to +180°]
 * Positive = clockwise / turn right, Negative = counter-clockwise / turn left
 */
export function shortestAngularDifference(fromAngle: number, toAngle: number): number {
  let diff = (toAngle - fromAngle) % 360
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff
}

/**
 * Calculates the forward spherical bearing (in degrees, 0°–360° from True North)
 * towards the Kaaba from the user's geographic coordinates using Great Circle Azimuth formula.
 */
export function calculateQiblaBearing(latitude: number, longitude: number): number {
  if (!isValidCoordinate(latitude, longitude)) {
    return 0
  }

  // If user is at or extremely close to the Kaaba (< 50 meters), bearing is 0
  const latDiff = Math.abs(latitude - KAABA_COORDINATES.latitude)
  const lngDiff = Math.abs(longitude - KAABA_COORDINATES.longitude)
  if (latDiff < 0.0005 && lngDiff < 0.0005) {
    return 0
  }

  const phi1 = latitude * DEG_TO_RAD
  const phi2 = KAABA_COORDINATES.latitude * DEG_TO_RAD
  const deltaLambda = (KAABA_COORDINATES.longitude - longitude) * DEG_TO_RAD

  const y = Math.sin(deltaLambda) * Math.cos(phi2)
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)

  let bearing = Math.atan2(y, x) * RAD_TO_DEG
  bearing = normalizeAngle(bearing)

  return Math.round(bearing * 10) / 10
}

/**
 * Calculates great-circle spherical distance to the Kaaba in kilometers (Haversine formula).
 */
export function calculateDistanceToKaabaKm(latitude: number, longitude: number): number {
  if (!isValidCoordinate(latitude, longitude)) {
    return 0
  }

  const phi1 = latitude * DEG_TO_RAD
  const phi2 = KAABA_COORDINATES.latitude * DEG_TO_RAD
  const deltaPhi = (KAABA_COORDINATES.latitude - latitude) * DEG_TO_RAD
  const deltaLambda = (KAABA_COORDINATES.longitude - longitude) * DEG_TO_RAD

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = EARTH_RADIUS_KM * c

  return Math.round(distance)
}

/**
 * Formats degrees into a 16-point cardinal compass direction (e.g. N, NNE, NE, ENE, E, ...).
 */
export function getCardinalDirection(degrees: number): string {
  const normalized = normalizeAngle(degrees)
  const points = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ]
  const index = Math.round(normalized / 22.5) % 16
  return points[index]
}

/**
 * Returns true if the device's current heading is within tolerance of the Qibla bearing.
 * Default tolerance is +/- 3 degrees for high precision alignment.
 */
export function isHeadingAligned(
  deviceHeading: number,
  qiblaBearing: number,
  toleranceDegrees: number = 3
): boolean {
  const diff = Math.abs(shortestAngularDifference(deviceHeading, qiblaBearing))
  return diff <= toleranceDegrees
}

/**
 * Computes angular difference between current device heading and Qibla bearing.
 * Returns signed degrees (-180 to +180). Positive means turn right, negative means turn left.
 */
export function getTurnAngle(deviceHeading: number, qiblaBearing: number): number {
  const diff = shortestAngularDifference(deviceHeading, qiblaBearing)
  return Math.round(diff * 10) / 10
}

/**
 * Exponential Moving Average (EMA) smoothing for compass heading with deadband threshold.
 * Prevents erratic jitter on noisy mobile magnetometers without introducing lag.
 */
export function smoothHeadingEMA(
  prevHeading: number | null,
  newHeading: number,
  alpha: number = 0.22,
  deadbandDegrees: number = 0.3
): number {
  if (prevHeading === null || isNaN(prevHeading)) {
    return normalizeAngle(newHeading)
  }
  const diff = shortestAngularDifference(prevHeading, newHeading)
  if (Math.abs(diff) < deadbandDegrees) {
    return prevHeading
  }
  const smoothed = prevHeading + alpha * diff
  return normalizeAngle(smoothed)
}

/**
 * Continuous unwrapped angle tracking with EMA smoothing.
 * Prevents 360° flip spin glitch in CSS transforms when transitioning between 359° and 0°.
 */
export function updateContinuousHeading(
  currentContinuous: number,
  newRawHeading: number,
  alpha: number = 0.22,
  deadbandDegrees: number = 0.3
): number {
  const currentAngleMod = normalizeAngle(currentContinuous)
  const diff = shortestAngularDifference(currentAngleMod, newRawHeading)
  if (Math.abs(diff) < deadbandDegrees) {
    return currentContinuous
  }
  return currentContinuous + diff * alpha
}
