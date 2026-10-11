/**
 * Islamic Qibla Direction & Distance Calculations
 * Based on authentic spherical trigonometry (Great Circle Azimuth) to the Holy Kaaba in Makkah Al-Mukarramah.
 */

// Authoritative coordinates of the Holy Kaaba (Masjid al-Haram, Makkah)
export const KAABA_COORDINATES = {
  latitude: 21.422487,
  longitude: 39.826206,
  name: 'Holy Kaaba, Makkah Al-Mukarramah',
}

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI
const EARTH_RADIUS_KM = 6371.0088

/**
 * Calculates the forward spherical bearing (in degrees, 0°–360° from True North)
 * towards the Kaaba from the user's geographic coordinates.
 */
export function calculateQiblaBearing(latitude: number, longitude: number): number {
  const phi1 = latitude * DEG_TO_RAD
  const phi2 = KAABA_COORDINATES.latitude * DEG_TO_RAD
  const deltaLambda = (KAABA_COORDINATES.longitude - longitude) * DEG_TO_RAD

  const y = Math.sin(deltaLambda) * Math.cos(phi2)
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)

  let bearing = Math.atan2(y, x) * RAD_TO_DEG
  bearing = (bearing + 360) % 360

  return Math.round(bearing * 10) / 10
}

/**
 * Calculates great-circle spherical distance to the Kaaba in kilometers (Haversine formula).
 */
export function calculateDistanceToKaabaKm(latitude: number, longitude: number): number {
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
 * Formats degrees into a 16-point cardinal compass direction (e.g. WNW, NW, ENE).
 */
export function getCardinalDirection(degrees: number): string {
  const normalized = (degrees % 360 + 360) % 360
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
  const diff = Math.abs(((deviceHeading - qiblaBearing + 180 + 360) % 360) - 180)
  return diff <= toleranceDegrees
}

/**
 * Computes angular difference between current device heading and Qibla bearing.
 * Returns signed degrees (-180 to +180). Positive means turn right, negative means turn left.
 */
export function getTurnAngle(deviceHeading: number, qiblaBearing: number): number {
  let diff = (qiblaBearing - deviceHeading) % 360
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return Math.round(diff * 10) / 10
}
