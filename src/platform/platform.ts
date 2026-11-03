import { Capacitor } from '@capacitor/core'

export type PlatformType = 'android' | 'ios' | 'web'

export const platform = {
  getPlatform(): PlatformType {
    const p = Capacitor.getPlatform()
    if (p === 'android') return 'android'
    if (p === 'ios') return 'ios'
    return 'web'
  },

  isNative(): boolean {
    return Capacitor.isNativePlatform()
  },

  isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android'
  },

  isIOS(): boolean {
    return Capacitor.getPlatform() === 'ios'
  },

  isWeb(): boolean {
    return !Capacitor.isNativePlatform()
  },

  isPWA(): boolean {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    )
  },
}
