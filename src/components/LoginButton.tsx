'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MiniKit,
  VerifyCommandInput,
  VerificationLevel,
  ISuccessResult,
  Permission,
} from '@worldcoin/minikit-js'
import { setSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

// Key for storing referral code in localStorage (matches page.tsx)
const REFERRAL_CODE_KEY = 'ojo_referral_code'

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
        // Request notification permission for new users
        try {
          await MiniKit.commandsAsync.requestPermission({
            permission: Permission.Notifications,
          })
        } catch (err) {
          // Silent fail - user may have denied or feature not available
          console.debug('Notification permission request:', err)
        }

        // Check for referral code and create referral record
        const referralCode = localStorage.getItem(REFERRAL_CODE_KEY)
        if (referralCode) {
          try {
            // Find the referrer by their referral code (first 8 chars of nullifier_hash)
            const { data: referrerData } = await supabase
              .from('users')
              .select('nullifier_hash')
              .ilike('nullifier_hash', `${referralCode}%`)
              .limit(1)
              .single()

            if (referrerData) {
              // Create referral record with status 'signed_up'
              await supabase.from('referrals').insert({
                referrer_id: referrerData.nullifier_hash,
                referred_id: data.nullifier_hash,
                referral_code: referralCode,
                status: 'signed_up',
              })
            }
            // Clear the referral code after processing
            localStorage.removeItem(REFERRAL_CODE_KEY)
          } catch (err) {
            console.error('Error processing referral:', err)
          }
        }

        router.push(`/onboarding?nullifier=${data.nullifier_hash}`)
      } else if (data.status === 'ok') {
        setSession({
          nullifier_hash: data.user.nullifier_hash,
          first_name: data.user.first_name,
          last_name: data.user.last_name,
          avatar_url: data.user.avatar_url,
        })
        // Request notification permission for returning users (if not already granted)
        try {
          await MiniKit.commandsAsync.requestPermission({
            permission: Permission.Notifications,
          })
        } catch (err) {
          // Silent fail - user may have denied or feature not available
          console.debug('Notification permission request:', err)
        }
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
