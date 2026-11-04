import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CURRENT_APP_VERSION,
  DEFAULT_RELEASE_METADATA,
  compareSemver,
  type AppReleaseMetadata,
} from '../config/version'
import { platform } from '../platform/platform'
import { salahApi } from '../services/backendApi'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// Global reference for install prompt event across component mounts
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    globalDeferredPrompt = e as BeforeInstallPromptEvent
    promptListeners.forEach((fn) => fn(globalDeferredPrompt))
  })

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null
    promptListeners.forEach((fn) => fn(null))
  })
}

export function useAppInstallation() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  )
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      platform.isNative()
    )
  })
  const [isIOS, setIsIOS] = useState<boolean>(false)
  const [isAndroid, setIsAndroid] = useState<boolean>(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState<boolean>(false)
  const [hasSwUpdate, setHasSwUpdate] = useState<boolean>(false)
  const [isUpdating, setIsUpdating] = useState<boolean>(false)
  const [releaseInfo, setReleaseInfo] = useState<AppReleaseMetadata>(DEFAULT_RELEASE_METADATA)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false)
  const [installError, setInstallError] = useState<string | null>(null)
  const [installSuccessMessage, setInstallSuccessMessage] = useState<string | null>(null)

  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null)

  // Listen for global beforeinstallprompt changes
  useEffect(() => {
    const handlePromptChange = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt)
    }
    promptListeners.add(handlePromptChange)
    return () => {
      promptListeners.delete(handlePromptChange)
    }
  }, [])

  // Device & Display Mode Detection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        platform.isNative()
      setIsInstalled(standalone)
    }

    checkStandalone()

    const media = window.matchMedia('(display-mode: standalone)')
    try {
      media.addEventListener('change', checkStandalone)
    } catch {
      media.addListener(checkStandalone)
    }

    const ua = window.navigator.userAgent.toLowerCase()
    const iosDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream
    const androidDevice = /android/.test(ua)
    setIsIOS(iosDevice)
    setIsAndroid(androidDevice)

    return () => {
      try {
        media.removeEventListener('change', checkStandalone)
      } catch {
        media.removeListener(checkStandalone)
      }
    }
  }, [])

  // Service Worker Update Detection
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return
      swRegistrationRef.current = reg

      if (reg.waiting) {
        setHasSwUpdate(true)
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setHasSwUpdate(true)
          }
        })
      })
    })

    const handleControllerChange = () => {
      // Reload safely if an update process was actively requested
      if (isUpdating) {
        window.location.reload()
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [isUpdating])

  // Fetch Latest Release Metadata from Backend
  const checkLatestVersion = useCallback(async () => {
    setIsCheckingUpdate(true)
    try {
      const res = await salahApi.getAppReleaseInfo()
      if (res?.success && res.data) {
        setReleaseInfo(res.data)
      }
    } catch (err) {
      console.warn('[useAppInstallation] Could not fetch remote release info:', err)
      // Falls back to DEFAULT_RELEASE_METADATA automatically
    } finally {
      setIsCheckingUpdate(false)
    }
  }, [])

  useEffect(() => {
    checkLatestVersion()
  }, [checkLatestVersion])

  // Semver Comparison: whether remote is strictly newer than current app version
  const hasVersionUpdate = compareSemver(releaseInfo.version, CURRENT_APP_VERSION) > 0
  const hasUpdate = hasSwUpdate || hasVersionUpdate

  // Trigger PWA Installation
  const installApp = useCallback(async (): Promise<boolean> => {
    setInstallError(null)
    setInstallSuccessMessage(null)

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === 'accepted') {
          setIsInstalled(true)
          setInstallSuccessMessage('Salah Companion successfully installed! You can now launch it directly from your home screen.')
          setDeferredPrompt(null)
          globalDeferredPrompt = null
          return true
        } else {
          return false
        }
      } catch (err: any) {
        console.error('[useAppInstallation] Install failed:', err)
        setInstallError(err?.message || 'Could not launch app installation dialog. Please try again or use your browser menu.')
        return false
      }
    }

    if (isIOS) {
      setShowIOSInstructions(true)
      return true
    }

    // Fallback for unsupported browsers
    setInstallError('Native install prompt is not supported in this browser. Tap your browser menu (⋮) and select "Add to Home screen" or "Install App".')
    return false
  }, [deferredPrompt, isIOS])

  // Trigger Safe PWA Update
  const updateApp = useCallback(async () => {
    setIsUpdating(true)
    try {
      const reg = swRegistrationRef.current || (await navigator.serviceWorker.getRegistration())
      if (reg && reg.waiting) {
        // Send skip waiting signal to the waiting worker
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      } else if (reg) {
        // Force an active check
        await reg.update()
      }
      // Give worker a brief moment to activate before reloading
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (err: any) {
      console.error('[useAppInstallation] Update activation error:', err)
      setIsUpdating(false)
      window.location.reload()
    }
  }, [])

  // Download Official Signed APK (when available)
  const downloadApk = useCallback(() => {
    if (!releaseInfo.apkDownloadUrl) {
      setInstallError('Official APK distribution is not yet configured. Please install Salah Companion using the 1-click Web App installation.')
      return
    }

    try {
      const parsed = new URL(releaseInfo.apkDownloadUrl)
      if (parsed.protocol !== 'https:') {
        setInstallError('Insecure APK URL detected. Only official HTTPS downloads are permitted.')
        return
      }
      // Trigger download
      window.open(releaseInfo.apkDownloadUrl, '_blank', 'noopener,noreferrer')
    } catch {
      setInstallError('Invalid APK download link. Please use the Web App installation.')
    }
  }, [releaseInfo.apkDownloadUrl])

  return {
    isInstalled,
    canInstall: Boolean(deferredPrompt) || isIOS,
    isIOS,
    isAndroid,
    isNative: platform.isNative(),
    isPwa: platform.isPWA(),
    hasUpdate,
    hasSwUpdate,
    hasVersionUpdate,
    isUpdating,
    isCheckingUpdate,
    installedVersion: CURRENT_APP_VERSION,
    latestVersion: releaseInfo.version,
    releaseDate: releaseInfo.releaseDate,
    releaseNotes: releaseInfo.releaseNotes,
    apkDownloadUrl: releaseInfo.apkDownloadUrl,
    minSupportedVersion: releaseInfo.minSupportedVersion,
    installError,
    setInstallError,
    installSuccessMessage,
    setInstallSuccessMessage,
    showIOSInstructions,
    setShowIOSInstructions,
    installApp,
    updateApp,
    downloadApk,
    checkLatestVersion,
  }
}
