import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authStorage } from '../services/backendApi'
import { platform } from '../platform/platform'
import { oauth } from '../platform/oauth'

/**
 * Dedicated OAuth and Deep Link Callback Handler
 * Handles both HTTPS App Links (https://salah-companion.mdsaif.workers.dev/auth-callback)
 * and custom-scheme fallback routes.
 */
export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate()
  const { refreshUser, setBanner } = useAuth()
  const [statusMessage, setStatusMessage] = useState('Completing authentication...')

  useEffect(() => {
    let isMounted = true

    const processAuth = async () => {
      try {
        const fullUrl = window.location.href
        let searchPart = ''
        if (fullUrl.includes('?')) {
          searchPart = fullUrl.substring(fullUrl.indexOf('?') + 1).split('#')[0]
        }
        let hashPart = ''
        if (fullUrl.includes('#')) {
          hashPart = fullUrl.substring(fullUrl.indexOf('#') + 1)
        }

        const queryParams = new URLSearchParams(searchPart)
        const hashParams = new URLSearchParams(hashPart)

        const token =
          queryParams.get('token') ||
          hashParams.get('token') ||
          queryParams.get('access_token') ||
          hashParams.get('access_token')

        const authStatus = queryParams.get('auth') || hashParams.get('auth')
        const authError =
          queryParams.get('auth_error') ||
          hashParams.get('auth_error') ||
          queryParams.get('error') ||
          hashParams.get('error')

        // Dismiss native in-app browser tab if open
        await oauth.closeBrowser()

        if (token || authStatus === 'google_success') {
          if (token) {
            authStorage.setToken(token)
          }

          setStatusMessage('Restoring your session...')
          const profile = await refreshUser()

          if (!isMounted) return

          if (profile) {
            setBanner({
              type: 'success',
              message: '🎉 Successfully signed in! Welcome back to Salah Companion.',
            })
          }

          // If on web and deep link explicitly requested native app handoff
          const isNativeAppHandOff = new URLSearchParams(window.location.search).get('native_handoff') === '1'
          if (!platform.isNative() && isNativeAppHandOff && (token || authStatus)) {
            const hasLaunchedApp = sessionStorage.getItem('salah_app_launched')
            if (!hasLaunchedApp) {
              sessionStorage.setItem('salah_app_launched', '1')
              try {
                window.location.replace(`com.salahcompanion.app://auth-callback?auth=google_success&token=${encodeURIComponent(token || '')}`)
              } catch {}
            }
          }

          navigate('/app', { replace: true })
          return
        }

        if (authError) {
          const errorDescriptions: Record<string, string> = {
            CSRF_STATE_MISMATCH: 'Security validation failed (CSRF mismatch). Please try again.',
            access_denied: 'Google sign-in was cancelled.',
            GOOGLE_NOT_CONFIGURED: 'Google Sign-In is not configured yet. Please configure a valid Google Web Client ID.',
            redirect_uri_mismatch: 'OAuth Redirect URI mismatch. Please verify Google Cloud Console settings.',
            MISSING_AUTH_CODE: 'Google did not return an authorization code. Please try again.',
            AUTH_FAILED: 'Google authentication failed. Please try again.',
          }

          setBanner({
            type: 'error',
            message: errorDescriptions[authError] || `Authentication failed: ${decodeURIComponent(authError)}`,
          })
          navigate('/login', { replace: true })
          return
        }

        // Default: If no token or error, navigate to app or login
        navigate('/app', { replace: true })
      } catch (err: any) {
        console.error('[AuthCallbackPage] Error:', err)
        setBanner({
          type: 'error',
          message: 'Failed to complete authentication. Please sign in again.',
        })
        navigate('/login', { replace: true })
      }
    }

    processAuth()

    return () => {
      isMounted = false
    }
  }, [navigate, refreshUser, setBanner])

  return (
    <div className="min-h-screen bg-[#064E3B] flex flex-col items-center justify-center p-6 text-white font-sans text-center">
      <div className="bg-[#07241A] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center">
        <div className="w-12 h-12 border-3 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mb-5" />
        <h2 className="text-xl font-bold mb-2 text-white">Returning to Salah Companion</h2>
        <p className="text-sm text-emerald-200/80 mb-6">{statusMessage}</p>
        <button
          type="button"
          onClick={() => navigate('/app', { replace: true })}
          className="text-xs text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
        >
          Click here if not redirected automatically
        </button>
      </div>
    </div>
  )
}

export default AuthCallbackPage
