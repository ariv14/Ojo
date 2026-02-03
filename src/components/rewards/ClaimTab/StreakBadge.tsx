'use client'

import { Flame } from 'lucide-react'

interface StreakBadgeProps {
  streak: number
  isActive?: boolean
}

export default function StreakBadge({ streak, isActive = false }: StreakBadgeProps) {
  const showFlame = streak > 0

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ${
        showFlame
          ? 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-600'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      <Flame
        className={`w-5 h-5 ${
          showFlame
            ? isActive
              ? 'animate-flame-pulse text-orange-500'
              : 'text-orange-500'
            : 'text-gray-400'
        }`}
      />
      <span className="tabular-nums text-lg">
        {streak}
      </span>
      <span className="text-sm font-medium opacity-75">
        {streak === 1 ? 'day' : 'days'}
      </span>
    </div>
  )
}
