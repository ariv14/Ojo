'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSession } from '@/lib/session'

export type ClaimState =
  | 'loading'
  | 'ready'
  | 'countdown'
  | 'claiming'
  | 'success'
  | 'unverified'
  | 'error'

export interface ClaimStatus {
  canClaim: boolean
  balance: number
  streak: number
  longestStreak: number
  totalClaimed: number
  claimCount: number
  nextClaimAt: string | null
  secondsUntil: number
  streakExpiresAt: string | null
}

export interface ClaimResult {
  success: boolean
  amount?: number
  newBalance?: number
  streak?: number
  longestStreak?: number
  isStreakBonus?: boolean
  streakBonus?: number
  wasStreakReset?: boolean
  message?: string
  error?: string
}

interface UseClaimStateReturn {
  state: ClaimState
  status: ClaimStatus | null
  lastClaimResult: ClaimResult | null
  fetchStatus: () => Promise<void>
  processClaim: () => Promise<ClaimResult | null>
  clearSuccess: () => void
  error: string | null
}

const DEFAULT_STATUS: ClaimStatus = {
  canClaim: false,
  balance: 0,
  streak: 0,
  longestStreak: 0,
  totalClaimed: 0,
  claimCount: 0,
  nextClaimAt: null,
  secondsUntil: 0,
  streakExpiresAt: null,
}

export function useClaimState(): UseClaimStateReturn {
  const [state, setState] = useState<ClaimState>('loading')
  const [status, setStatus] = useState<ClaimStatus | null>(null)
  const [lastClaimResult, setLastClaimResult] = useState<ClaimResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    const session = getSession()

    if (!session?.nullifier_hash) {
      setState('unverified')
      return
    }

    setState('loading')
    setError(null)

    try {
      const res = await fetch(`/api/rewards/status?userId=${session.nullifier_hash}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch status')
      }

      setStatus(data)
      setState(data.canClaim ? 'ready' : 'countdown')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load rewards status'
      setError(message)
      setState('error')
      console.error('Error fetching claim status:', err)
    }
  }, [])

  const processClaim = useCallback(async (): Promise<ClaimResult | null> => {
    const session = getSession()

    if (!session?.nullifier_hash) {
      setState('unverified')
      return null
    }

    setState('claiming')
    setError(null)

    try {
      const res = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.nullifier_hash }),
      })

      const data: ClaimResult = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Claim failed')
      }

      setLastClaimResult(data)
      setState('success')

      // Update local status with new values
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              balance: data.newBalance ?? prev.balance,
              streak: data.streak ?? prev.streak,
              longestStreak: data.longestStreak ?? prev.longestStreak,
              canClaim: false,
              secondsUntil: 24 * 60 * 60, // 24 hours
            }
          : null
      )

      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Claim failed'
      setError(message)
      setState('error')
      console.error('Error processing claim:', err)
      return null
    }
  }, [])

  const clearSuccess = useCallback(() => {
    setLastClaimResult(null)
    setState('countdown')
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Re-fetch when countdown expires
  useEffect(() => {
    if (state === 'countdown' && status?.secondsUntil) {
      const timeout = setTimeout(() => {
        fetchStatus()
      }, (status.secondsUntil + 1) * 1000)

      return () => clearTimeout(timeout)
    }
  }, [state, status?.secondsUntil, fetchStatus])

  return {
    state,
    status: status ?? DEFAULT_STATUS,
    lastClaimResult,
    fetchStatus,
    processClaim,
    clearSuccess,
    error,
  }
}
