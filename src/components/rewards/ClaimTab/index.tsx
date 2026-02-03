'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useClaimState } from '@/hooks/useClaimState'
import StreakBadge from './StreakBadge'
import BalancePill from './BalancePill'
import SlideToClaim from './SlideToClaim'
import BigTimer from './BigTimer'
import CoinShower from './CoinShower'
import DashboardCards from './DashboardCards'
import { Loader2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ClaimTab() {
  const router = useRouter()
  const {
    state,
    status,
    lastClaimResult,
    processClaim,
    fetchStatus,
    clearSuccess,
    error,
  } = useClaimState()

  const [showCoinShower, setShowCoinShower] = useState(false)
  const [animateBalance, setAnimateBalance] = useState(false)

  const handleClaim = async () => {
    const result = await processClaim()
    if (result?.success) {
      setShowCoinShower(true)
      setAnimateBalance(true)
    }
  }

  const handleCoinShowerComplete = () => {
    setShowCoinShower(false)
    setTimeout(() => {
      setAnimateBalance(false)
      clearSuccess()
    }, 500)
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--oro-cyan)] animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading rewards...</p>
      </div>
    )
  }

  // Unverified state
  if (state === 'unverified') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Verify with World ID</h2>
        <p className="text-gray-500 mb-6 max-w-xs">
          You need to verify with World ID to claim daily OJO rewards.
        </p>
        <button
          onClick={() => router.push('/')}
          className="btn-oro-3d px-6 py-3"
        >
          Verify Now
        </button>
      </div>
    )
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-500 mb-6 max-w-xs">{error || 'Failed to load rewards'}</p>
        <button
          onClick={fetchStatus}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-800 text-white font-semibold hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-8">
      {/* Coin Shower Animation */}
      <CoinShower show={showCoinShower} onComplete={handleCoinShowerComplete} />

      {/* Success Toast */}
      <AnimatePresence>
        {state === 'success' && lastClaimResult && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl border border-green-200 px-6 py-4 max-w-xs w-full"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                +{lastClaimResult.amount?.toFixed(2)} OJO
              </div>
              <p className="text-sm text-gray-600">{lastClaimResult.message}</p>
              {lastClaimResult.isStreakBonus && (
                <p className="text-xs text-orange-500 mt-1 font-medium">
                  Includes +{lastClaimResult.streakBonus?.toFixed(1)} streak bonus!
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Stats */}
      <div className="flex flex-col items-center gap-4">
        <BalancePill balance={status?.balance ?? 0} animate={animateBalance} />
        <StreakBadge
          streak={status?.streak ?? 0}
          isActive={state === 'ready'}
        />
      </div>

      {/* Main Claim Area */}
      <div className="py-8">
        {state === 'ready' || state === 'claiming' || state === 'success' ? (
          <div className="flex flex-col items-center gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center mb-4"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Claim Your Daily OJO
              </h2>
              <p className="text-gray-500">
                Slide to claim{' '}
                <span className="font-semibold text-[var(--oro-cyan)]">
                  1.0{status && status.streak > 0 ? ` + ${Math.min(status.streak * 0.1, 1.0).toFixed(1)}` : ''} OJO
                </span>
              </p>
            </motion.div>

            <SlideToClaim
              onClaim={handleClaim}
              disabled={state === 'claiming' || state === 'success'}
            />
          </div>
        ) : state === 'countdown' ? (
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Come back tomorrow!
              </h2>
              <p className="text-gray-500 text-sm">
                Keep your streak alive by claiming within 48 hours
              </p>
            </motion.div>

            <BigTimer
              secondsUntil={status?.secondsUntil ?? 0}
              onExpire={fetchStatus}
            />
          </div>
        ) : null}
      </div>

      {/* Dashboard Cards */}
      <DashboardCards
        totalClaimed={status?.totalClaimed ?? 0}
        claimCount={status?.claimCount ?? 0}
        currentStreak={status?.streak ?? 0}
        longestStreak={status?.longestStreak ?? 0}
      />
    </div>
  )
}
