'use client'

import { Coins } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BalancePillProps {
  balance: number
  animate?: boolean
}

export default function BalancePill({ balance, animate = false }: BalancePillProps) {
  const [displayBalance, setDisplayBalance] = useState(balance)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (animate && balance !== displayBalance) {
      setIsAnimating(true)

      // Animate the number counting up
      const startValue = displayBalance
      const endValue = balance
      const duration = 1000
      const startTime = Date.now()

      const animateValue = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        const currentValue = startValue + (endValue - startValue) * easeOutCubic

        setDisplayBalance(currentValue)

        if (progress < 1) {
          requestAnimationFrame(animateValue)
        } else {
          setDisplayBalance(endValue)
          setTimeout(() => setIsAnimating(false), 500)
        }
      }

      requestAnimationFrame(animateValue)
    } else if (!animate) {
      setDisplayBalance(balance)
    }
  }, [balance, animate, displayBalance])

  return (
    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200/50 shadow-sm">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-inner">
        <Coins className="w-3.5 h-3.5 text-white" />
      </div>
      <span
        className={`font-bold text-xl tabular-nums text-amber-700 ${
          isAnimating ? 'animate-balance-glow' : ''
        }`}
      >
        {displayBalance.toFixed(2)}
      </span>
      <span className="text-sm font-semibold text-amber-600/80">OJO</span>
    </div>
  )
}
