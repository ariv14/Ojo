'use client'

import { useState, useEffect } from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  className?: string
}

const sizeConfig = {
  sm: {
    text: 'text-xl',
    eyeOuter: 'w-5 h-5',
    eyeMiddle: 'w-3.5 h-3.5',
    eyeInner: 'w-2 h-2',
    coreSize: 'w-1 h-1',
    arcWidth: '2px',
    glowSize: '4px',
  },
  md: {
    text: 'text-2xl',
    eyeOuter: 'w-6 h-6',
    eyeMiddle: 'w-4 h-4',
    eyeInner: 'w-2.5 h-2.5',
    coreSize: 'w-1.5 h-1.5',
    arcWidth: '2px',
    glowSize: '6px',
  },
  lg: {
    text: 'text-4xl',
    eyeOuter: 'w-9 h-9',
    eyeMiddle: 'w-6 h-6',
    eyeInner: 'w-3.5 h-3.5',
    coreSize: 'w-2 h-2',
    arcWidth: '3px',
    glowSize: '8px',
  },
  xl: {
    text: 'text-6xl',
    eyeOuter: 'w-14 h-14',
    eyeMiddle: 'w-9 h-9',
    eyeInner: 'w-5 h-5',
    coreSize: 'w-3 h-3',
    arcWidth: '4px',
    glowSize: '12px',
  },
}

export default function Logo({ size = 'lg', animated = true, className = '' }: LogoProps) {
  const config = sizeConfig[size]
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const shouldAnimate = animated && !prefersReducedMotion

  const CyberEye = ({ delayed = false }: { delayed?: boolean }) => (
    <span className="relative inline-flex items-center justify-center">
      {/* Hidden O for spacing */}
      <span className="opacity-0">O</span>

      {/* Eye container */}
      <span className="absolute inset-0 flex items-center justify-center">
        {/* Outer ring - dark with cyan border and glow */}
        <span
          className={`${config.eyeOuter} rounded-full flex items-center justify-center relative ${shouldAnimate ? `cyber-ring-glow ${delayed ? 'cyber-blink-delayed' : 'cyber-blink'}` : ''}`}
          style={{
            background: 'linear-gradient(135deg, #0A1628 0%, #1E3A8A 100%)',
            border: '2px solid #00FFFF',
            boxShadow: `0 0 ${config.glowSize} rgba(0, 255, 255, 0.5), inset 0 0 ${config.glowSize} rgba(0, 255, 255, 0.2)`,
          }}
        >
          {/* Scanning arc - rotating */}
          <span
            className={`absolute inset-0 rounded-full ${shouldAnimate ? 'cyber-scan' : ''}`}
            style={{
              background: 'conic-gradient(from 0deg, transparent 0deg, rgba(0, 255, 255, 0.8) 30deg, transparent 60deg)',
              animationDelay: delayed ? '1.5s' : '0s',
            }}
          />

          {/* Middle ring - blue gradient */}
          <span
            className={`${config.eyeMiddle} rounded-full flex items-center justify-center relative z-10`}
            style={{
              background: 'radial-gradient(circle at center, #0080FF 0%, #1E3A8A 70%, #0A1628 100%)',
              boxShadow: 'inset 0 0 4px rgba(0, 128, 255, 0.5)',
            }}
          >
            {/* Inner iris - bright cyan */}
            <span
              className={`${config.eyeInner} rounded-full flex items-center justify-center`}
              style={{
                background: 'radial-gradient(circle at center, #00FFFF 0%, #0080FF 60%, #1E3A8A 100%)',
                boxShadow: '0 0 6px rgba(0, 255, 255, 0.6)',
              }}
            >
              {/* Core - pulsing bright point */}
              <span
                className={`${config.coreSize} rounded-full ${shouldAnimate ? 'cyber-core-pulse' : ''}`}
                style={{
                  background: 'radial-gradient(circle at center, #FFFFFF 0%, #00FFFF 50%, transparent 100%)',
                  boxShadow: '0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(0, 255, 255, 0.6)',
                  animationDelay: delayed ? '1s' : '0s',
                }}
              />
            </span>
          </span>
        </span>
      </span>
    </span>
  )

  return (
    <span className={`${config.text} font-bold flex items-center ${className}`}>
      <CyberEye delayed={false} />

      {/* J with shimmer effect */}
      <span className="mx-1 relative inline-block">
        {/* Base J with gradient */}
        <span
          style={{
            background: 'linear-gradient(180deg, #00FFFF 0%, #0080FF 50%, #8B5CF6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 8px rgba(0, 255, 255, 0.5))',
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
      </span>

      <CyberEye delayed={true} />
    </span>
  )
}
