import { useState, useEffect, useRef, useCallback } from 'react'

interface UseExitConfirmationOptions {
  enabled?: boolean
  hasInnerModalOpen?: boolean
  onCloseInnerModal?: () => void
}

/**
 * Production-ready exit confirmation hook for desktop and mobile.
 *
 * Provides:
 * 1. Native `beforeunload` warning on browser tab close, reload, or external navigation.
 * 2. Custom confirmation modal on browser back button / mobile back gesture (`popstate`)
 *    asking: "Are you sure you want to leave Salah Companion?" with "Stay" and "Leave".
 * 3. Session preservation: Leaving never logs the user out or clears saved Salah records.
 * 4. Guards against infinite loops and repeated warnings.
 */
export function useExitConfirmation(options: UseExitConfirmationOptions = {}) {
  const {
    enabled = true,
    hasInnerModalOpen = false,
    onCloseInnerModal,
  } = options

  const [showExitModal, setShowExitModal] = useState(false)
  const isExitingRef = useRef(false)

  // 1. Native browser exit warning on tab close, window close, reload, or external navigation
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isExitingRef.current) return
      // Standard W3C / modern browser specification
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled])

  // 2. Intercept browser back button & mobile back navigation (popstate)
  useEffect(() => {
    if (!enabled) return

    // Push initial history state to intercept the back action
    window.history.pushState({ salahApp: true }, '', window.location.href)

    const handlePopState = () => {
      if (isExitingRef.current) return

      // If an in-app inner modal is open (e.g. Qibla, Notifications, Calendar), close that first
      if (hasInnerModalOpen && onCloseInnerModal) {
        onCloseInnerModal()
        window.history.pushState({ salahApp: true }, '', window.location.href)
        return
      }

      // If the exit modal is already open, keep it open
      if (showExitModal) {
        window.history.pushState({ salahApp: true }, '', window.location.href)
        return
      }

      // Re-push history state so the user remains on current URL and show exit confirmation dialog
      window.history.pushState({ salahApp: true }, '', window.location.href)
      setShowExitModal(true)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [enabled, hasInnerModalOpen, onCloseInnerModal, showExitModal])

  // User chooses "Stay": close modal and remain in app
  const handleStay = useCallback(() => {
    setShowExitModal(false)
  }, [])

  // User chooses "Leave": allow exit/navigation without clearing session or records
  const handleLeave = useCallback(() => {
    isExitingRef.current = true
    setShowExitModal(false)

    // Attempt window.close() where browser permits (e.g. standalone PWAs or script-opened windows)
    try {
      window.close()
    } catch {}

    // Allow backward navigation or exit where browser permits
    if (window.history.length > 2) {
      window.history.go(-2)
    } else {
      window.history.back()
    }
  }, [])

  const triggerExitPrompt = useCallback(() => {
    setShowExitModal(true)
  }, [])

  return {
    showExitModal,
    setShowExitModal,
    handleStay,
    handleLeave,
    triggerExitPrompt,
  }
}
