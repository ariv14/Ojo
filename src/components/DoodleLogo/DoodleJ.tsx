'use client'

import { JVariant, Theme } from '@/lib/doodle/types'

interface DoodleJProps {
  variant: JVariant
  theme: Theme
  shouldAnimate: boolean
}

export default function DoodleJ({ variant, theme, shouldAnimate }: DoodleJProps) {
  const baseGradient = `linear-gradient(180deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 50%, #8B5CF6 100%)`

  const renderDecoration = () => {
    switch (variant) {
      case 'leaf':
        return (
          <span className="absolute -top-1 -right-1 text-[0.4em]">
            <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke={theme.colors.primary} strokeWidth="2">
              <path d="M12 2C6 8 4 14 4 20c6-2 12-6 16-18-4 2-8 4-8 4s-2-2 0-4z" fill={theme.colors.primary} fillOpacity="0.3" />
            </svg>
          </span>
        )
      case 'heart':
        return (
          <span className={`absolute -top-1 -right-1 text-[0.5em] ${shouldAnimate ? 'doodle-heart-beat' : ''}`}>
            <svg viewBox="0 0 24 24" fill={theme.colors.primary} className="w-3 h-3">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </span>
        )
      case 'sparkle':
        return (
          <span className={`absolute -top-1 -right-0.5 ${shouldAnimate ? 'doodle-sparkle' : ''}`}>
            <svg viewBox="0 0 24 24" fill={theme.colors.primary} className="w-2.5 h-2.5">
              <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
            </svg>
          </span>
        )
      case 'flame':
        return (
          <span className={`absolute -top-2 left-1/2 -translate-x-1/2 ${shouldAnimate ? 'doodle-flame-flicker' : ''}`}>
            <svg viewBox="0 0 24 24" fill="url(#flameGradient)" className="w-3 h-4">
              <defs>
                <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor={theme.colors.primary} />
                  <stop offset="100%" stopColor={theme.colors.secondary} />
                </linearGradient>
              </defs>
              <path d="M12 23c-4.5 0-8-3.5-8-8 0-3 2-6 4-8 0 2 1 3 2 3 0-4 3-8 6-10 0 3-1 5 0 7 1 0 2-1 2-3 2 2 2 5 2 7 0 6.5-3.5 12-8 12z" />
            </svg>
          </span>
        )
      default:
        return null
    }
  }

  return (
    <span className="mx-1 relative inline-block">
      {/* Base J with gradient */}
      <span
        style={{
          background: baseGradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: `drop-shadow(0 0 8px ${theme.colors.glow})`,
        }}
      >
        J
      </span>

      {/* Shimmer overlay */}
      {shouldAnimate && (
        <span
          className="absolute inset-0 cyber-shimmer pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mixBlendMode: 'overlay',
          }}
        >
          J
        </span>
      )}

      {/* Decoration */}
      {renderDecoration()}
    </span>
  )
}
