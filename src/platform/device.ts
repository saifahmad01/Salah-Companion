import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import type { PluginListenerHandle } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { platform } from './platform'

export const device = {
  /**
   * Configures status bar styling with Islamic Emerald Theme
   */
  async configureStatusBar(): Promise<void> {
    if (!platform.isNative()) return

    try {
      await StatusBar.setStyle({ style: Style.Dark })
      if (platform.isAndroid()) {
        await StatusBar.setBackgroundColor({ color: '#064E3B' })
      }
    } catch (err) {
      console.warn('[Device] StatusBar styling error:', err)
    }
  },

  /**
   * Registers a hardware back button handler (Android)
   * The handler should return true if it consumed the back event, or false/undefined to allow exit
   */
  addBackButtonListener(handler: () => boolean | void): () => void {
    if (!platform.isNative()) {
      return () => {}
    }

    let listenerHandle: PluginListenerHandle | null = null

    App.addListener('backButton', () => {
      const handled = handler()
      if (!handled) {
        // Default action if handler did not consume event
      }
    }).then((handle) => {
      listenerHandle = handle
    })

    return () => {
      if (listenerHandle) {
        listenerHandle.remove()
      }
    }
  },

  /**
   * Listen for application resume / pause events
   */
  addAppStateListener(handler: (isActive: boolean) => void): () => void {
    if (!platform.isNative()) {
      const onFocus = () => handler(true)
      const onBlur = () => handler(false)
      window.addEventListener('focus', onFocus)
      window.addEventListener('blur', onBlur)
      return () => {
        window.removeEventListener('focus', onFocus)
        window.removeEventListener('blur', onBlur)
      }
    }

    let listenerHandle: PluginListenerHandle | null = null

    App.addListener('appStateChange', (state) => {
      handler(state.isActive)
    }).then((handle) => {
      listenerHandle = handle
    })

    return () => {
      if (listenerHandle) {
        listenerHandle.remove()
      }
    }
  },

  /**
   * Trigger haptic feedback for user interactions (e.g. prayer completed, Kaaba aligned)
   */
  async hapticFeedback(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
    try {
      if (platform.isNative()) {
        const impact =
          style === 'light'
            ? ImpactStyle.Light
            : style === 'heavy'
            ? ImpactStyle.Heavy
            : ImpactStyle.Medium
        await Haptics.impact({ style: impact })
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(style === 'heavy' ? 80 : 35)
      }
    } catch {
      // Ignore vibration errors on unsupported devices
    }
  },

  /**
   * Vibrate pattern for Qibla alignment
   */
  async vibrateAlignment(): Promise<void> {
    try {
      if (platform.isNative()) {
        await Haptics.vibrate({ duration: 100 })
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([60, 40, 60])
      }
    } catch {}
  },

  /**
   * Exit app (native Android only)
   */
  exitApp(): void {
    if (platform.isNative()) {
      App.exitApp()
    }
  },

  /**
   * Open external URL in system browser or Maps app without breaking Capacitor WebView
   */
  async openExternalUrl(url: string): Promise<void> {
    if (!url) return
    try {
      if (platform.isNative()) {
        await Browser.open({ url })
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      console.warn('[Device] Failed to open external URL:', err)
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  },
}
