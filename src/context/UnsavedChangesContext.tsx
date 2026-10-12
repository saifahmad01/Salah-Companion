import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { ExitConfirmationModal, type ExitModalConfig } from '../components/ExitConfirmationModal'

export interface ActionConfig {
  title?: string
  message?: string
  confirmText?: string
  confirmLabel?: string
  cancelText?: string
  cancelLabel?: string
  type?: 'unsaved' | 'logout' | 'navigation'
  variant?: 'unsaved' | 'logout' | 'navigation'
}

export interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean
  dirtyKeys: Record<string, string>
  setDirty: (key: string, isDirty: boolean, label?: string) => void
  clearAllDirty: () => void
  confirmAction: (config: ActionConfig, onProceed: () => void) => void
  promptLogout: (onProceed: () => Promise<void> | void) => void
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined)

export const UnsavedChangesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dirtyKeys, setDirtyKeys] = useState<Record<string, string>>({})
  const [modalConfig, setModalConfig] = useState<ExitModalConfig | null>(null)

  const hasUnsavedChanges = useMemo(() => Object.keys(dirtyKeys).length > 0, [dirtyKeys])

  const setDirty = useCallback((key: string, isDirty: boolean, label = 'Unsaved changes') => {
    setDirtyKeys((prev) => {
      if (isDirty) {
        if (prev[key] === label) return prev
        return { ...prev, [key]: label }
      } else {
        if (!prev[key]) return prev
        const updated = { ...prev }
        delete updated[key]
        return updated
      }
    })
  }, [])

  const clearAllDirty = useCallback(() => {
    setDirtyKeys({})
  }, [])

  /**
   * 1. Browser Native `beforeunload` Listener
   *
   * Note on Modern Browser Sandbox Security:
   * Modern desktop and mobile browsers (Chrome, Firefox, Safari, Edge) strictly forbid
   * custom HTML dialogs or custom text strings during tab close, window close, or refresh.
   * Browsers display their native localized prompt ("Changes you made may not be saved. Leave / Cancel").
   *
   * We only register this listener when hasUnsavedChanges is true, ensuring normal navigation
   * and clean tabs never encounter unnecessary warnings.
   */
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Standard HTML5 / W3C cross-browser specification
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  /**
   * 2. Browser Back / Forward Button Interception (popstate)
   * When user clicks browser back/forward while unsaved changes exist,
   * push state back to trap the exit and display the custom confirmation dialog.
   */
  useEffect(() => {
    if (!hasUnsavedChanges) return

    // Push dummy history entry so back button triggers popstate before leaving
    window.history.pushState({ unsavedTrap: true }, '', window.location.href)

    const handlePopState = () => {
      if (hasUnsavedChanges) {
        // Re-push state so user remains on current screen
        window.history.pushState({ unsavedTrap: true }, '', window.location.href)

        setModalConfig({
          isOpen: true,
          title: 'Unsaved Changes Detected',
          message:
            'You have unsaved changes in your active form or workflow. If you navigate back now, your changes will be discarded.',
          confirmText: 'Discard & Leave',
          cancelText: 'Stay on Page',
          type: 'unsaved',
          hasUnsaved: true,
          onConfirm: () => {
            clearAllDirty()
            setModalConfig(null)
            // Allow back navigation
            window.history.back()
          },
          onCancel: () => {
            setModalConfig(null)
          },
        })
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [hasUnsavedChanges, clearAllDirty])

  /**
   * 3. In-App Workflow or Navigation Confirmation Helper
   */
  const confirmAction = useCallback(
    (config: ActionConfig, onProceed: () => void) => {
      if (!hasUnsavedChanges && config.type !== 'logout') {
        onProceed()
        return
      }

      const actionType = config.type || config.variant || 'unsaved'
      setModalConfig({
        isOpen: true,
        title: config.title || (actionType === 'logout' ? 'Confirm Sign Out' : 'Discard Unsaved Changes?'),
        message:
          config.message ||
          (hasUnsavedChanges
            ? 'You have unsaved changes in progress that will be lost. Are you sure you want to proceed?'
            : 'Are you sure you want to leave this page?'),
        confirmText: config.confirmText || config.confirmLabel || (actionType === 'logout' ? 'Sign Out' : 'Discard & Leave'),
        cancelText: config.cancelText || config.cancelLabel || 'Stay on Page',
        type: actionType,
        hasUnsaved: hasUnsavedChanges,
        onConfirm: () => {
          clearAllDirty()
          setModalConfig(null)
          onProceed()
        },
        onCancel: () => {
          setModalConfig(null)
        },
      })
    },
    [hasUnsavedChanges, clearAllDirty]
  )

  /**
   * 4. In-App Logout Confirmation Helper
   */
  const promptLogout = useCallback(
    (onProceed: () => Promise<void> | void) => {
      setModalConfig({
        isOpen: true,
        title: hasUnsavedChanges ? 'Unsaved Changes & Sign Out' : 'Sign Out of Salah Companion',
        message: hasUnsavedChanges
          ? 'You have unsaved changes in your active session. Signing out now will discard your unsaved work. Are you sure you want to sign out?'
          : 'Are you sure you want to sign out of your account? You will need to log in again to track your Salah.',
        confirmText: hasUnsavedChanges ? 'Discard & Sign Out' : 'Sign Out',
        cancelText: 'Cancel',
        type: 'logout',
        hasUnsaved: hasUnsavedChanges,
        onConfirm: async () => {
          clearAllDirty()
          setModalConfig(null)
          await onProceed()
        },
        onCancel: () => {
          setModalConfig(null)
        },
      })
    },
    [hasUnsavedChanges, clearAllDirty]
  )

  return (
    <UnsavedChangesContext.Provider
      value={{
        hasUnsavedChanges,
        dirtyKeys,
        setDirty,
        clearAllDirty,
        confirmAction,
        promptLogout,
      }}
    >
      {children}
      {modalConfig && <ExitConfirmationModal {...modalConfig} />}
    </UnsavedChangesContext.Provider>
  )
}

export const useUnsavedChanges = (): UnsavedChangesContextType => {
  const context = useContext(UnsavedChangesContext)
  if (!context) {
    throw new Error('useUnsavedChanges must be used within an UnsavedChangesProvider')
  }
  return context
}

/**
 * Convenient hook for forms and workflows to register/unregister dirty state automatically
 */
export const useUnsavedChangesWarn = (key: string, isDirty: boolean, label?: string) => {
  const { setDirty } = useUnsavedChanges()

  useEffect(() => {
    setDirty(key, isDirty, label)
    return () => {
      setDirty(key, false)
    }
  }, [key, isDirty, label, setDirty])
}
