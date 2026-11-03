import React, { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      const dismissedUntil = localStorage.getItem('salah_pwa_dismissed_until')
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        return true
      }
    } catch {}
    return false
  })
  const [isInstalled, setIsInstalled] = useState<boolean>(false)
  const [isIOS, setIsIOS] = useState<boolean>(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState<boolean>(false)

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      Boolean((window as any).Capacitor?.isNativePlatform?.())

    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream
    setIsIOS(isIosDevice)

    // Capture install prompt on Chromium / Android
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      try {
        localStorage.removeItem('salah_pwa_dismissed_until')
      } catch {}
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === 'accepted') {
          setIsInstalled(true)
        }
        setDeferredPrompt(null)
      } catch (err) {
        console.error('Install prompt failed:', err)
      }
    } else if (isIOS) {
      setShowIOSInstructions(true)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    try {
      // Dismiss for 7 days
      localStorage.setItem(
        'salah_pwa_dismissed_until',
        String(Date.now() + 7 * 24 * 60 * 60 * 1000)
      )
    } catch {}
  }

  if (isInstalled || isDismissed || (!deferredPrompt && !isIOS)) {
    return null
  }

  return (
    <>
      {/* Floating Install Prompt Banner */}
      <aside
        aria-label="Install Application Banner"
        className="fixed bottom-18 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-slide-up"
      >
        <div className="bg-[#0C382B] text-white p-4 rounded-2xl shadow-2xl border border-[#E2B755]/30 backdrop-blur-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-950 p-1 border border-[#E2B755]/40 flex-shrink-0 shadow-md">
              <img
                src="/pwa-192x192.png"
                alt="Salah App"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-sm text-[#F6E6C2]">
                  Install Salah App
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#E2B755] text-[#0C382B] font-bold text-[9px] uppercase tracking-wider">
                  Fast
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 leading-snug">
                Instant access, prayer alarms & offline features
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-[#E2B755] hover:bg-[#D4A33B] text-[#0C382B] font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1 active:scale-95 touch-target"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install banner"
              className="w-8 h-8 rounded-lg text-emerald-300/70 hover:text-white hover:bg-emerald-900/40 flex items-center justify-center transition cursor-pointer touch-target"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#FAF8F3] text-stone-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-stone-200 relative">
            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center mb-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0C382B] p-1.5 shadow-lg border border-[#E2B755]/30 mb-3">
                <img
                  src="/pwa-192x192.png"
                  alt="Salah App"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <h3 className="font-serif font-bold text-lg text-emerald-950">Install on iPhone / iPad</h3>
              <p className="text-xs text-stone-600 mt-1">Add to your Home Screen in 2 simple steps:</p>
            </div>
            <ol className="space-y-3 text-xs text-stone-700 bg-stone-100/70 p-4 rounded-2xl border border-stone-200">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#0C382B] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                  1
                </span>
                <span>
                  Tap the <strong>Share</strong> button at the bottom of Safari (square with arrow up).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#0C382B] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                  2
                </span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#0C382B] text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
