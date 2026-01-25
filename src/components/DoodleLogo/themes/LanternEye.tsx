'use client'

import { EyeProps } from '@/lib/doodle/types'
import { sizeConfig } from '../sizeConfig'

export default function LanternEye({ size, offset, isWinking, isClicked, shouldAnimate, delayed, theme }: EyeProps) {
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
        {/* Lantern body */}
        <span
          className={`${config.eyeOuter} rounded-full flex items-center justify-center relative ${
            shouldAnimate ? 'doodle-idle-flicker' : ''
          } ${isClicked ? 'doodle-click-glow' : ''}`}
          style={{
            background: `linear-gradient(180deg, ${theme.colors.primary} 0%, #B91C1C 100%)`,
            border: `2px solid ${theme.colors.secondary}`,
            boxShadow: `0 0 ${config.glowSize} ${theme.colors.glow}, inset 0 0 10px rgba(255, 200, 0, 0.4)`,
            transform: isWinking && !delayed ? 'scaleY(0.1)' : 'scaleY(1)',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* Lantern ribs */}
          <span
            className="absolute inset-1 rounded-full"
            style={{
              background: 'repeating-conic-gradient(from 0deg, transparent 0deg 20deg, rgba(0,0,0,0.1) 20deg 40deg)',
            }}
          />

          {/* Inner glow (flame) */}
          <span
            className={`${config.eyeMiddle} rounded-full flex items-center justify-center relative z-10 ${
              shouldAnimate ? 'doodle-flame-flicker' : ''
            }`}
            style={{
              background: `radial-gradient(circle at center, ${theme.colors.secondary} 0%, #F97316 50%, transparent 100%)`,
              boxShadow: `0 0 10px ${theme.colors.secondary}`,
              animationDelay: delayed ? '0.3s' : '0s',
            }}
          >
            {/* Flame core */}
            <span
              className={`${config.eyeInner} rounded-full`}
              style={{
                background: `radial-gradient(circle at center, #FFFBEB 0%, ${theme.colors.secondary} 60%, transparent 100%)`,
                boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
              }}
            />
          </span>
        </span>

        {/* Top ornament */}
        <span
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
          style={{
            background: theme.colors.secondary,
            boxShadow: `0 0 4px ${theme.colors.secondary}`,
          }}
        />
      </span>
    </span>
  )
}
