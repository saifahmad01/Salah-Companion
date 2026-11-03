import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { platform } from './platform'
import { salahApi } from '../services/backendApi'

export const ANDROID_OAUTH_REDIRECT_URI = 'com.salahcompanion.app://auth-callback'

let browserFinishedHandle: PluginListenerHandle | null = null

export const oauth = {
  /**
   * Initiate Google OAuth flow based on current platform.
   * On Native Android: Opens in-app Chrome Custom Tab with deep link callback.
   * On Web / PWA: Standard window.location.href navigation.
   */
  async startGoogleOAuth(onCancelled?: () => void): Promise<void> {
    if (platform.isNative()) {
      const authUrl = salahApi.getGoogleOAuthUrl(ANDROID_OAUTH_REDIRECT_URI)

      if (browserFinishedHandle) {
        await browserFinishedHandle.remove()
        browserFinishedHandle = null
      }

      browserFinishedHandle = await Browser.addListener('browserFinished', () => {
        if (browserFinishedHandle) {
          browserFinishedHandle.remove()
          browserFinishedHandle = null
        }
        if (onCancelled) {
          onCancelled()
        }
      })

      await Browser.open({
        url: authUrl,
        windowName: '_blank',
        presentationStyle: 'popover',
      })
    } else {
      window.location.href = salahApi.getGoogleOAuthUrl()
    }
  },

  /**
   * Dismiss the in-app browser overlay upon receiving the OAuth callback.
   */
  async closeBrowser(): Promise<void> {
    if (browserFinishedHandle) {
      await browserFinishedHandle.remove()
      browserFinishedHandle = null
    }
    if (platform.isNative()) {
      try {
        await Browser.close()
      } catch {
        // Safe to ignore if browser was already closed
      }
    }
  },

  /**
   * Register a listener for native deep links (custom scheme and HTTPS App Links).
   */
  addUrlOpenListener(callback: (url: string) => void): () => void {
    if (!platform.isNative()) {
      return () => {}
    }

    let handle: PluginListenerHandle | null = null
    App.addListener('appUrlOpen', (event) => {
      if (event?.url) {
        callback(event.url)
      }
    }).then((h) => {
      handle = h
    })

    return () => {
      if (handle) {
        handle.remove()
      }
    }
  },

  /**
   * Check if application was cold-launched via an OAuth deep link.
   */
  async getLaunchUrl(): Promise<string | null> {
    if (!platform.isNative()) {
      return null
    }
    try {
      const launch = await App.getLaunchUrl()
      return launch?.url || null
    } catch {
      return null
    }
  },
}
