import { useState, useEffect, useRef, useCallback } from 'react'

interface UseExitConfirmationOptions {
  enabled?: boolean
  hasInnerModalOpen?: boolean
  onCloseInnerModal?: () => void
  hasInnerNavigation?: boolean
  onNavigateBack?: () => void
}

/**
 * Production-ready exit confirmation hook for desktop and mobile.
 *
 * Provides:
 * 1. Native `beforeunload` warning on browser tab close, reload, or external navigation.
 * 2. Mobile back gesture / browser back button (`popstate`) handling:
 *    - Closes open modals first
 *    - Returns to Home screen if on another tab/screen
 *    - Shows "Are you sure you want to leave Salah Companion?" confirmation when on Home screen
 * 3. Session preservation: Leaving never logs the user out or clears saved Salah records.
 * 4. Guards against infinite history state push loops and double-firing.
 */
export function useExitConfirmation(options: UseExitConfirmationOptions = {}) {
  const {
    enabled = true,
    hasInnerModalOpen = false,
    onCloseInnerModal,
    hasInnerNavigation = false,
    onNavigateBack,
  } = options

  const [showExitModal, setShowExitModal] = useState(false)
  const isExitingRef = useRef(false)

  // Stable references to latest callbacks and flags
  const hasInnerModalOpenRef = useRef(hasInnerModalOpen)
  hasInnerModalOpenRef.current = hasInnerModalOpen

  const onCloseInnerModalRef = useRef(onCloseInnerModal)
  onCloseInnerModalRef.current = onCloseInnerModal

  const hasInnerNavigationRef = useRef(hasInnerNavigation)
  hasInnerNavigationRef.current = hasInnerNavigation

  const onNavigateBackRef = useRef(onNavigateBack)
  onNavigateBackRef.current = onNavigateBack

  const showExitModalRef = useRef(showExitModal)
  showExitModalRef.current = showExitModal

  // 1. Native browser exit warning on tab close, window close, reload, or external navigation
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isExitingRef.current) return
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled])

  // 2. Intercept browser back button & mobile back gesture (popstate)
  useEffect(() => {
    if (!enabled) return

    // Push initial history state once so the back button is intercepted
    window.history.pushState({ salahApp: true }, '', window.location.href)

    const handlePopState = () => {
      if (isExitingRef.current) return

      // Step 1: If an in-app modal is open (Qibla, Calendar, Prayer Status, etc.), close it first
      if (hasInnerModalOpenRef.current && onCloseInnerModalRef.current) {
        onCloseInnerModalRef.current()
        window.history.pushState({ salahApp: true }, '', window.location.href)
        return
      }

      // Step 2: If on an inner tab (My Salah, Hadith, Progress, Settings), go back to Home
      if (hasInnerNavigationRef.current && onNavigateBackRef.current) {
        onNavigateBackRef.current()
        window.history.pushState({ salahApp: true }, '', window.location.href)
        return
      }

      // Step 3: If the exit modal is already open, dismiss it
      if (showExitModalRef.current) {
        setShowExitModal(false)
        window.history.pushState({ salahApp: true }, '', window.location.href)
        return
      }

      // Step 4: User is on Home with no modals open: show exit confirmation dialog
      window.history.pushState({ salahApp: true }, '', window.location.href)
      setShowExitModal(true)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [enabled])

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
