'use client'

import { EyeProps } from '@/lib/doodle/types'
import { sizeConfig } from '../sizeConfig'

export default function GlobeEye({ size, offset, isWinking, isClicked, shouldAnimate, delayed, theme }: EyeProps) {
  const config = sizeConfig[size]

  return (
    <span className="relative inline-flex items-center justify-center">
      <span className="opacity-0">O</span>

      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Globe body */}
        <span
          className={`${config.eyeOuter} rounded-full flex items-center justify-center relative overflow-hidden ${
            isClicked ? 'doodle-click-spin' : ''
          }`}
          style={{
            background: `linear-gradient(180deg, ${theme.colors.secondary} 0%, #1D4ED8 50%, #1E3A8A 100%)`,
            border: '2px solid rgba(255,255,255,0.3)',
            boxShadow: `0 0 ${config.glowSize} ${theme.colors.glow}`,
            transform: isWinking && !delayed ? 'scaleY(0.1)' : 'scaleY(1)',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* Continents layer */}
          <span
            className={`absolute inset-0 ${shouldAnimate ? 'doodle-idle-spin-slow' : ''}`}
            style={{
              background: `
                radial-gradient(ellipse 60% 40% at 30% 40%, ${theme.colors.primary}80 0%, transparent 50%),
                radial-gradient(ellipse 40% 30% at 70% 30%, ${theme.colors.primary}80 0%, transparent 50%),
                radial-gradient(ellipse 50% 40% at 50% 70%, ${theme.colors.primary}80 0%, transparent 50%)
              `,
              animationDelay: delayed ? '2s' : '0s',
            }}
          />

          {/* Latitude lines */}
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                repeating-linear-gradient(
                  0deg,
                  transparent 0%,
                  transparent 20%,
                  rgba(255,255,255,0.1) 20%,
                  rgba(255,255,255,0.1) 21%,
                  transparent 21%,
                  transparent 40%
                )
              `,
            }}
          />

          {/* Atmosphere glow */}
          <span
            className={`${config.eyeMiddle} rounded-full absolute`}
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 50%)',
            }}
          />

          {/* Center eye point */}
          <span
            className={`${config.coreSize} rounded-full z-10 ${shouldAnimate ? 'cyber-core-pulse' : ''}`}
            style={{
              background: 'radial-gradient(circle at center, #FFFFFF 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
              boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
              animationDelay: delayed ? '1s' : '0s',
            }}
          />
        </span>
      </span>
    </span>
  )
}
