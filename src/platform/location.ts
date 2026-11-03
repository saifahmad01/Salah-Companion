import { Geolocation } from '@capacitor/geolocation'
import { platform } from './platform'

export interface Coordinates {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface LocationResult {
  success: boolean
  coords?: Coordinates
  error?: string
  isPermissionDenied?: boolean
}

export const location = {
  /**
   * Request GPS / Location permissions
   */
  async requestPermission(): Promise<boolean> {
    if (platform.isNative()) {
      try {
        const status = await Geolocation.requestPermissions()
        return status.location === 'granted' || status.coarseLocation === 'granted'
      } catch (err) {
        console.warn('[Location] Native permission request error:', err)
        return false
      }
    }

    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' })
        return status.state === 'granted' || status.state === 'prompt'
      } catch {
        return true
      }
    }

    return true
  },

  /**
   * Get current device GPS coordinates with timeout protection
   */
  async getCurrentPosition(timeoutMs = 15000): Promise<LocationResult> {
    if (platform.isNative()) {
      try {
        // First verify or ask permission
        const perm = await Geolocation.checkPermissions()
        if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
          const req = await Geolocation.requestPermissions()
          if (req.location !== 'granted' && req.coarseLocation !== 'granted') {
            return {
              success: false,
              isPermissionDenied: true,
              error: 'Location permission was denied. Please allow location in Android Settings.',
            }
          }
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 60000,
        })

        return {
          success: true,
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        }
      } catch (err: any) {
        console.error('[Location] Native Geolocation error:', err)
        return {
          success: false,
          error: err?.message || 'Failed to detect current GPS location.',
        }
      }
    }

    // Web Browser Fallback
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return {
        success: false,
        error: 'Geolocation is not supported by your browser.',
      }
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            success: true,
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            },
          })
        },
        (err) => {
          const isDenied = err.code === err.PERMISSION_DENIED
          resolve({
            success: false,
            isPermissionDenied: isDenied,
            error: isDenied
              ? 'Location permission was denied. Please allow location access in your browser.'
              : err.message || 'Unable to retrieve location.',
          })
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 60000,
        }
      )
    })
  },
}
