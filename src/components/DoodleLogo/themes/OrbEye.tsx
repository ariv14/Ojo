'use client'

import { EyeProps } from '@/lib/doodle/types'
import { sizeConfig } from '../sizeConfig'

export default function OrbEye({ size, offset, isWinking, isClicked, shouldAnimate, delayed, theme }: EyeProps) {
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
        {/* World ID Orb */}
        <span
          className={`${config.eyeOuter} rounded-full flex items-center justify-center relative ${
            shouldAnimate ? 'doodle-idle-pulse' : ''
          } ${isClicked ? 'doodle-click-glow' : ''}`}
          style={{
            background: `linear-gradient(135deg, #0F172A 0%, ${theme.colors.primary} 50%, #0F172A 100%)`,
            border: `2px solid ${theme.colors.secondary}`,
            boxShadow: `0 0 ${config.glowSize} ${theme.colors.glow}, 0 0 20px ${theme.colors.glow}`,
            transform: isWinking && !delayed ? 'scaleY(0.1)' : 'scaleY(1)',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* Circuit pattern */}
          <span
            className={`absolute inset-0 rounded-full overflow-hidden ${shouldAnimate ? 'cyber-scan' : ''}`}
            style={{ animationDuration: '6s', animationDelay: delayed ? '3s' : '0s' }}
          >
            <svg viewBox="0 0 40 40" className="w-full h-full opacity-30">
              <circle cx="20" cy="20" r="15" fill="none" stroke={theme.colors.secondary} strokeWidth="0.5" strokeDasharray="2 4" />
              <circle cx="20" cy="20" r="10" fill="none" stroke={theme.colors.secondary} strokeWidth="0.5" strokeDasharray="1 3" />
              <line x1="20" y1="5" x2="20" y2="12" stroke={theme.colors.secondary} strokeWidth="0.5" />
              <line x1="20" y1="28" x2="20" y2="35" stroke={theme.colors.secondary} strokeWidth="0.5" />
              <line x1="5" y1="20" x2="12" y2="20" stroke={theme.colors.secondary} strokeWidth="0.5" />
              <line x1="28" y1="20" x2="35" y2="20" stroke={theme.colors.secondary} strokeWidth="0.5" />
            </svg>
          </span>

          {/* Inner iris */}
          <span
            className={`${config.eyeMiddle} rounded-full flex items-center justify-center relative z-10`}
            style={{
              background: `radial-gradient(circle at center, ${theme.colors.secondary} 0%, ${theme.colors.primary} 70%, #0F172A 100%)`,
              boxShadow: `inset 0 0 8px ${theme.colors.glow}`,
            }}
          >
            {/* Scanning line */}
            {shouldAnimate && (
              <span
                className="absolute w-full h-0.5 doodle-orb-scan"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.colors.secondary}, transparent)`,
                  animationDelay: delayed ? '1.5s' : '0s',
                }}
              />
            )}

            {/* Core with World ID style */}
            <span
              className={`${config.eyeInner} rounded-full flex items-center justify-center`}
              style={{
                background: `radial-gradient(circle at center, #FFFFFF 0%, ${theme.colors.secondary} 50%, ${theme.colors.primary} 100%)`,
                boxShadow: `0 0 8px ${theme.colors.glow}`,
              }}
            >
              <span
                className={`${config.coreSize} rounded-full ${shouldAnimate ? 'cyber-core-pulse' : ''}`}
                style={{
                  background: 'radial-gradient(circle at center, #FFFFFF 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                  boxShadow: '0 0 10px rgba(255, 255, 255, 0.9)',
                  animationDelay: delayed ? '1s' : '0s',
                }}
              />
            </span>
          </span>
        </span>
      </span>
    </span>
  )
}
