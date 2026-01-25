'use client'

import { EyeProps } from '@/lib/doodle/types'
import { sizeConfig } from '../sizeConfig'

export default function DefaultEye({ size, offset, isWinking, isClicked, shouldAnimate, delayed, theme }: EyeProps) {
  const config = sizeConfig[size]

  return (
    <span className="relative inline-flex items-center justify-center">
      {/* Hidden O for spacing */}
      <span className="opacity-0">O</span>

      {/* Eye container */}
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Outer ring */}
        <span
          className={`${config.eyeOuter} rounded-full flex items-center justify-center relative ${
            shouldAnimate ? `cyber-ring-glow ${delayed ? 'cyber-blink-delayed' : 'cyber-blink'}` : ''
          } ${isClicked ? 'doodle-click-spin' : ''}`}
          style={{
            background: 'linear-gradient(135deg, #0A1628 0%, #1E3A8A 100%)',
            border: `2px solid ${theme.colors.primary}`,
            boxShadow: `0 0 ${config.glowSize} ${theme.colors.glow}, inset 0 0 ${config.glowSize} rgba(0, 255, 255, 0.2)`,
            transform: isWinking && !delayed ? 'scaleY(0.1)' : 'scaleY(1)',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* Scanning arc */}
          <span
            className={`absolute inset-0 rounded-full ${shouldAnimate ? 'cyber-scan' : ''}`}
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, ${theme.colors.primary}CC 30deg, transparent 60deg)`,
              animationDelay: delayed ? '1.5s' : '0s',
            }}
          />

          {/* Middle ring */}
          <span
            className={`${config.eyeMiddle} rounded-full flex items-center justify-center relative z-10`}
            style={{
              background: `radial-gradient(circle at center, ${theme.colors.secondary} 0%, #1E3A8A 70%, #0A1628 100%)`,
              boxShadow: `inset 0 0 4px ${theme.colors.glow}`,
            }}
          >
            {/* Inner iris */}
            <span
              className={`${config.eyeInner} rounded-full flex items-center justify-center`}
              style={{
                background: `radial-gradient(circle at center, ${theme.colors.primary} 0%, ${theme.colors.secondary} 60%, #1E3A8A 100%)`,
                boxShadow: `0 0 6px ${theme.colors.glow}`,
              }}
            >
              {/* Core */}
              <span
                className={`${config.coreSize} rounded-full ${shouldAnimate ? 'cyber-core-pulse' : ''}`}
                style={{
                  background: `radial-gradient(circle at center, #FFFFFF 0%, ${theme.colors.primary} 50%, transparent 100%)`,
                  boxShadow: `0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px ${theme.colors.glow}`,
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
