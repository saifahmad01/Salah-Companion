import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Legacy VerifyEmailPage has been retired in favor of direct 6-digit Email OTP login.
 * Automatically forwards any legacy traffic to the OTP login screen.
 */
export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/login?notice=use_otp', { replace: true })
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#07241A] flex items-center justify-center font-sans">
      <div className="text-center text-emerald-200">
        <p className="text-sm font-semibold">Redirecting to Secure Login...</p>
      </div>
    </div>
  )
}

export default VerifyEmailPage
