import React, { useState } from 'react'
import {
  Download,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Smartphone,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  Share2,
  PlusSquare,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { useAppInstallation } from '../hooks/useAppInstallation'

export const AppInstallationSection: React.FC = () => {
  const {
    isInstalled,
    canInstall,
    isIOS,
        hasUpdate,
    isUpdating,
    isCheckingUpdate,
    installedVersion,
    latestVersion,
    releaseDate,
    releaseNotes,
    apkDownloadUrl,
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
  } = useAppInstallation()

  const [showNotes, setShowNotes] = useState(false)
  const [showDesktopHelp, setShowDesktopHelp] = useState(false)

  const handlePrimaryAction = async () => {
    setInstallError(null)
    setInstallSuccessMessage(null)

    if (hasUpdate) {
      await updateApp()
      return
    }

    if (!isInstalled) {
      if (canInstall) {
        await installApp()
      } else if (isIOS) {
        setShowIOSInstructions(true)
      } else {
        setShowDesktopHelp(true)
      }
    } else {
      // If already installed and no update, check for latest version
      await checkLatestVersion()
    }
  }

  return (
    <div className="w-full rounded-[24px] bg-white border border-[#EDE8DC] p-4 sm:p-5 shadow-xs space-y-4">
      {/* Section Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0C4535] to-[#082E22] text-[#F5DC96] flex items-center justify-center flex-shrink-0 shadow-xs">
            <Smartphone className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-bold text-[#14261E]">
                Download Salah Companion
              </h3>
              {hasUpdate ? (
                <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Update Ready
                </span>
              ) : isInstalled ? (
                <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  App Installed
                </span>
              ) : (
                <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Ready to Install
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-[#5A6C62] mt-0.5 leading-snug">
              Install Salah Companion on your device for a better, app-like experience with offline access and prompt prayer reminders.
            </p>
          </div>
        </div>
      </div>

      {/* Version & Status Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
        <div className="p-3 rounded-2xl bg-[#FAF8F3] border border-[#E9E4D8] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
            Installed Version
          </span>
          <span className="text-sm font-mono font-bold text-[#14261E] mt-1">
            v{installedVersion}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#FAF8F3] border border-[#E9E4D8] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
            Latest Available
          </span>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-sm font-mono font-bold text-[#0E543F]">
              v{latestVersion}
            </span>
            {hasUpdate && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-[#FAF8F3] border border-[#E9E4D8] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
            Release Date
          </span>
          <span className="text-xs font-mono font-semibold text-stone-700 mt-1">
            {releaseDate}
          </span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {installSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{installSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setInstallSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {installError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="leading-tight">{installError}</span>
          </div>
          <button
            type="button"
            onClick={() => setInstallError(null)}
            className="text-rose-700 hover:text-rose-950 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="space-y-2 pt-1">
        {/* Action 1: Install or Update */}
        {hasUpdate ? (
          <button
            type="button"
            disabled={isUpdating}
            onClick={updateApp}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs sm:text-[13px] shadow-sm transition cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60 touch-manipulation"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Activating Update...' : 'Update Available — Update Now'}</span>
          </button>
        ) : !isInstalled ? (
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#0C4535] to-[#0E543F] hover:from-[#083327] hover:to-[#0C4535] text-white font-bold text-xs sm:text-[13px] shadow-sm transition cursor-pointer flex items-center justify-center gap-2 active:scale-98 touch-manipulation"
          >
            <Download className="w-4 h-4 text-[#F5DC96]" />
            <span>Download / Install App</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Salah Companion is Installed</span>
            </div>
            <button
              type="button"
              disabled={isCheckingUpdate}
              onClick={checkLatestVersion}
              title="Check for newest updates"
              className="py-2.5 px-3 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Check Updates</span>
            </button>
          </div>
        )}

        {/* Action 2: Download Official Signed APK (if URL configured by admin) */}
        {apkDownloadUrl && (
          <button
            type="button"
            onClick={downloadApk}
            className="w-full py-2.5 px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Download Official Android APK (v{latestVersion})</span>
            <ExternalLink className="w-3 h-3 text-stone-400" />
          </button>
        )}
      </div>

      {/* Release Notes Accordion */}
      {releaseNotes && releaseNotes.length > 0 && (
        <div className="pt-2 border-t border-[#F0EDE5]">
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="w-full py-1.5 flex items-center justify-between text-xs text-[#0E543F] font-semibold hover:text-[#083327] cursor-pointer transition"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>What's New in v{latestVersion}</span>
            </div>
            {showNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showNotes && (
            <ul className="mt-2 space-y-1.5 text-[11px] text-[#4F6056] bg-[#FAF8F3] p-3 rounded-xl border border-[#EDE8DC] animate-fade-in">
              {releaseNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#0E543F] font-bold">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* iOS Safari Installation Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-[#FAF8F3] text-stone-900 w-full max-w-sm rounded-[24px] p-6 shadow-2xl border border-stone-200 relative animate-scale-up">
            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#0C4535] to-[#082E22] p-1.5 shadow-lg border border-[#E2B755]/30 mb-3 flex items-center justify-center">
                <img
                  src="/pwa-192x192.png"
                  alt="Salah App"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <h3 className="text-base font-bold text-emerald-950">Install on iPhone / iPad</h3>
              <p className="text-xs text-stone-600 mt-1">Add to Home Screen in 2 simple steps:</p>
            </div>

            <ol className="space-y-3 text-xs text-stone-700 bg-white p-4 rounded-2xl border border-stone-200">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#0C4535] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <span>Tap the <strong>Share</strong> button at the bottom of Safari:</span>
                  <div className="inline-flex items-center gap-1 font-semibold text-emerald-800 ml-1.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <Share2 className="w-3 h-3" />
                    <span>Share</span>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#0C4535] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <span>Scroll down and select:</span>
                  <div className="inline-flex items-center gap-1 font-semibold text-emerald-800 ml-1.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <PlusSquare className="w-3 h-3" />
                    <span>Add to Home Screen</span>
                  </div>
                </div>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#0C4535] text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-98"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Desktop / Alternative Browser Instructions Modal */}
      {showDesktopHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-[#FAF8F3] text-stone-900 w-full max-w-sm rounded-[24px] p-6 shadow-2xl border border-stone-200 relative animate-scale-up">
            <button
              type="button"
              onClick={() => setShowDesktopHelp(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-4">
              <h3 className="text-base font-bold text-emerald-950">Install Salah Companion</h3>
              <p className="text-xs text-stone-600 mt-1">To install on your computer or browser:</p>
            </div>

            <div className="space-y-3 text-xs text-stone-700 bg-white p-4 rounded-2xl border border-stone-200">
              <div className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
                <span>In <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>, click the <strong>Install</strong> icon in the address bar (on the right side).</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
                <span>Or open your browser menu (⋮) $\to$ <strong>Save and share</strong> $\to$ <strong>Install Salah Companion</strong>.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDesktopHelp(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#0C4535] text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-98"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
