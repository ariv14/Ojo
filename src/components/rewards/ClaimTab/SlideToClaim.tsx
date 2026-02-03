'use client'

import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { ChevronRight, Check, Loader2 } from 'lucide-react'

interface SlideToClaimProps {
  onClaim: () => Promise<void>
  disabled?: boolean
}

export default function SlideToClaim({ onClaim, disabled = false }: SlideToClaimProps) {
  const constraintsRef = useRef<HTMLDivElement>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)

  const x = useMotionValue(0)
  const trackWidth = 280 // Total track width
  const thumbWidth = 64 // Thumb size
  const maxDrag = trackWidth - thumbWidth - 8 // Account for padding

  // Progress transforms
  const progress = useTransform(x, [0, maxDrag], [0, 1])
  const progressBarWidth = useTransform(x, [0, maxDrag], ['0%', '100%'])
  const textOpacity = useTransform(x, [0, maxDrag * 0.3], [1, 0])
  const checkOpacity = useTransform(x, [maxDrag * 0.8, maxDrag], [0, 1])

  const handleDragEnd = async () => {
    const currentX = x.get()
    const currentProgress = currentX / maxDrag

    if (currentProgress >= 0.95 && !disabled && !isClaiming) {
      setIsComplete(true)
      setIsClaiming(true)

      // Snap to end
      animate(x, maxDrag, { type: 'spring', stiffness: 400, damping: 30 })

      // Trigger haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([50, 30, 100])
      }

      try {
        await onClaim()
      } finally {
        // Reset after animation
        setTimeout(() => {
          setIsComplete(false)
          setIsClaiming(false)
          animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 })
        }, 2000)
      }
    } else {
      // Spring back to start
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 })
    }
  }

  // Haptic feedback at checkpoints
  const handleDrag = () => {
    const currentProgress = x.get() / maxDrag

    // Trigger subtle haptics at 25%, 50%, 75%
    const checkpoints = [0.25, 0.5, 0.75]
    for (const checkpoint of checkpoints) {
      if (
        Math.abs(currentProgress - checkpoint) < 0.02 &&
        typeof navigator !== 'undefined' &&
        'vibrate' in navigator
      ) {
        navigator.vibrate(10)
      }
    }
  }

  return (
    <div className="w-full max-w-xs mx-auto">
      <div
        ref={constraintsRef}
        className={`relative h-16 rounded-full overflow-hidden ${
          disabled
            ? 'bg-gray-200 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-100 via-white to-purple-100 animate-slide-glow'
        }`}
        style={{ width: trackWidth }}
      >
        {/* Progress fill */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--oro-cyan)] to-[var(--oro-purple)] rounded-full"
          style={{ width: progressBarWidth }}
        />

        {/* Text label */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: textOpacity }}
        >
          <span className="text-sm font-semibold text-gray-600 ml-12">
            {disabled ? 'Come back tomorrow' : 'Slide to claim'}
          </span>
        </motion.div>

        {/* Complete checkmark */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: checkOpacity }}
        >
          <Check className="w-6 h-6 text-white" />
        </motion.div>

        {/* Draggable thumb */}
        <motion.div
          drag={disabled || isClaiming ? false : 'x'}
          dragConstraints={{ left: 0, right: maxDrag }}
          dragElastic={0}
          dragMomentum={false}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className={`absolute top-1 left-1 w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing ${
            disabled
              ? 'bg-gray-400'
              : isComplete
                ? 'bg-green-500'
                : 'bg-gradient-to-br from-[var(--oro-cyan)] to-[var(--oro-purple)]'
          }`}
          whileTap={disabled ? {} : { scale: 1.05 }}
        >
          {isClaiming ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : isComplete ? (
            <Check className="w-6 h-6 text-white" />
          ) : (
            <div className="flex">
              <ChevronRight className="w-5 h-5 text-white -mr-2" />
              <ChevronRight className="w-5 h-5 text-white/70" />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
