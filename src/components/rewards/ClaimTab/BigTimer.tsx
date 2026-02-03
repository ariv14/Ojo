'use client'

import { useCountdown } from '@/hooks/useCountdown'
import { Clock } from 'lucide-react'

interface BigTimerProps {
  secondsUntil: number
  onExpire?: () => void
}

export default function BigTimer({ secondsUntil, onExpire }: BigTimerProps) {
  const { hours, minutes, seconds, isExpired, formatted } = useCountdown(secondsUntil)

  // Notify parent when timer expires
  if (isExpired && onExpire) {
    onExpire()
  }

  const TimeDigit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border border-white/50 min-w-[72px]">
          <span className="text-4xl font-bold tabular-nums text-gray-800">
            {value.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-500 mt-2 uppercase tracking-wider">
        {label}
      </span>
    </div>
  )

  const Separator = () => (
    <div className="flex flex-col justify-center gap-2 pb-6">
      <div className="w-2 h-2 rounded-full bg-gray-400" />
      <div className="w-2 h-2 rounded-full bg-gray-400" />
    </div>
  )

  if (isExpired) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 text-green-600 font-semibold text-lg">
          <Clock className="w-5 h-5" />
          <span>Ready to claim!</span>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center">
      {/* Timer display */}
      <div className="flex items-start justify-center gap-3 mb-4">
        <TimeDigit value={hours} label="Hours" />
        <Separator />
        <TimeDigit value={minutes} label="Minutes" />
        <Separator />
        <TimeDigit value={seconds} label="Seconds" />
      </div>

      {/* Subtitle */}
      <p className="text-gray-500 text-sm font-medium">Until your next claim</p>
    </div>
  )
}
