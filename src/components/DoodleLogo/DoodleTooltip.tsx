'use client'

import { useEffect, useRef } from 'react'
import { Holiday } from '@/lib/doodle/types'

interface DoodleTooltipProps {
  holiday: Holiday
  isVisible: boolean
  onClose: () => void
}

export default function DoodleTooltip({ holiday, isVisible, onClose }: DoodleTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isVisible) return

    // Auto-dismiss after 3 seconds
    const timer = setTimeout(onClose, 3000)

    // Close on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside as EventListener)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside as EventListener)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  return (
    <div
      ref={tooltipRef}
      className="absolute top-full left-0 mt-3 z-50 doodle-tooltip-enter"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 min-w-[200px] max-w-[280px]">
        <div className="text-center">
          {holiday.id !== 'default' && (
            <p className="text-sm font-semibold text-gray-800 mb-1">
              {holiday.name}
            </p>
          )}
          <p className="text-sm text-gray-600">
            {holiday.description}
          </p>
        </div>
        {/* Tooltip arrow */}
        <div className="absolute -top-2 left-6 w-4 h-4 bg-white/95 rotate-45 rounded-sm" />
      </div>
    </div>
  )
}
