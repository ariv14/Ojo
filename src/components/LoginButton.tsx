'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MiniKit,
  VerifyCommandInput,
  VerificationLevel,
  ISuccessResult,
} from '@worldcoin/minikit-js'
import { setSession } from '@/lib/session'

export default function LoginButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleVerify = async () => {
    if (!MiniKit.isInstalled()) {
      alert('Please open this app in World App')
      return
    }

    setIsLoading(true)

    try {
      const verifyPayload: VerifyCommandInput = {
        action: process.env.NEXT_PUBLIC_ACTION!,
        verification_level: VerificationLevel.Orb,
      }

      console.log('Sending verify with:', verifyPayload)
      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload)
      console.log('Received payload:', JSON.stringify(finalPayload, null, 2))

      if (finalPayload.status === 'error') {
        const errorPayload = finalPayload as { status: 'error'; error_code?: string; message?: string }
        console.error('Verification error:', errorPayload)
        alert(`Verification failed: ${errorPayload.error_code || errorPayload.message || 'Unknown error'}`)
        setIsLoading(false)
        return
      }

      // Send proof to backend for verification (wallet not needed at login)
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: finalPayload as ISuccessResult,
        }),
      })

      const data = await response.json()

      if (data.status === 'new_user') {
        router.push(`/onboarding?nullifier=${data.nullifier_hash}`)
      } else if (data.status === 'ok') {
        setSession({
          nullifier_hash: data.user.nullifier_hash,
          first_name: data.user.first_name,
          last_name: data.user.last_name,
          avatar_url: data.user.avatar_url,
        })
        router.push('/feed')
      } else {
        console.error('Verification failed:', data)
        alert(`Error: ${data.message}\nDetails: ${JSON.stringify(data.details)}`)
      }
    } catch (error) {
      console.error('Error during verification:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleVerify}
      disabled={isLoading}
      className="bg-black text-white px-6 py-3 rounded-full font-medium disabled:opacity-50"
    >
      {isLoading ? 'Verifying...' : 'Verify with World ID'}
    </button>
  )
}
