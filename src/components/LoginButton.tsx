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
  const [statusMessage, setStatusMessage] = useState('')

  const handleVerify = async () => {
    if (!MiniKit.isInstalled()) {
      alert('Please open this app in World App')
      return
    }

    setIsLoading(true)
    setStatusMessage('Verifying identity...')

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
        setStatusMessage('')
        return
      }

      // Step 2: Connect wallet to get profile data
      setStatusMessage('Connecting wallet...')
      const nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 16)

      let walletAddress: string | null = null
      let profileData: { username?: string; profilePictureUrl?: string; walletAddress?: string } | null = null

      try {
        const { finalPayload: walletPayload } = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement: 'Sign in to OJO',
        })

        if (walletPayload.status === 'success') {
          walletAddress = walletPayload.address
          console.log('Wallet connected:', walletAddress)

          // Step 3: Fetch user profile from World App
          setStatusMessage('Fetching profile...')
          try {
            const userProfile = await MiniKit.getUserByAddress(walletAddress)
            console.log('User profile:', userProfile)
            if (userProfile) {
              profileData = {
                username: userProfile.username || undefined,
                profilePictureUrl: userProfile.profilePictureUrl || undefined,
                walletAddress: walletAddress,
              }
            }
          } catch (profileErr) {
            console.debug('Could not fetch user profile:', profileErr)
            // Continue without profile data - will generate fallback username
            profileData = {
              walletAddress: walletAddress,
            }
          }
        }
      } catch (walletErr) {
        console.error('Wallet auth error:', walletErr)
        // Wallet auth failed - cannot proceed without wallet
        alert('Wallet connection is required to sign in')
        setIsLoading(false)
        setStatusMessage('')
        return
      }

      // Step 4: Send proof and profile data to backend for verification
      setStatusMessage('Creating account...')
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: finalPayload as ISuccessResult,
          profileData: profileData,
        }),
      })

      const data = await response.json()

      if (data.status === 'ok') {
        // Set session with new fields
        setSession({
          nullifier_hash: data.user.nullifier_hash,
          username: data.user.username,
          avatar_url: data.user.avatar_url,
          wallet_address: data.user.wallet_address,
          // Keep deprecated fields for backwards compatibility
          first_name: data.user.first_name || data.user.username,
          last_name: data.user.last_name,
        })

        // Request notification permission
        try {
          await MiniKit.commandsAsync.requestPermission({
            permission: Permission.Notifications,
          })
        } catch (err) {
          console.debug('Notification permission request:', err)
        }

        // Handle referral for new users
        if (data.isNewUser) {
          const referralCode = localStorage.getItem(REFERRAL_CODE_KEY)
          if (referralCode) {
            try {
              const { data: referrerData } = await supabase
                .from('users')
                .select('nullifier_hash')
                .ilike('nullifier_hash', `${referralCode}%`)
                .limit(1)
                .single()

              if (referrerData) {
                await supabase.from('referrals').insert({
                  referrer_id: referrerData.nullifier_hash,
                  referred_id: data.user.nullifier_hash,
                  referral_code: referralCode,
                  status: 'signed_up',
                })
              }
              localStorage.removeItem(REFERRAL_CODE_KEY)
            } catch (err) {
              console.error('Error processing referral:', err)
            }
          }
        }

        // Go straight to feed - no onboarding needed
        router.push('/feed')
      } else {
        console.error('Verification failed:', data)
        alert(`Error: ${data.message}\nDetails: ${JSON.stringify(data.details)}`)
      }
    } catch (error) {
      console.error('Error during verification:', error)
    } finally {
      setIsLoading(false)
      setStatusMessage('')
    }
  }

  return (
    <button
      onClick={handleVerify}
      disabled={isLoading}
      className="bg-black text-white px-6 py-3 rounded-full font-medium disabled:opacity-50"
    >
      {isLoading ? (statusMessage || 'Verifying...') : 'Verify with World ID'}
    </button>
  )
}
