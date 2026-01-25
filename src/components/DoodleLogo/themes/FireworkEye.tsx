'use client'

import { EyeProps } from '@/lib/doodle/types'
import { sizeConfig } from '../sizeConfig'

export default function FireworkEye({ size, offset, isWinking, isClicked, shouldAnimate, delayed, theme }: EyeProps) {
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
        {/* Firework burst */}
        <span
          className={`${config.eyeOuter} rounded-full flex items-center justify-center relative ${
            shouldAnimate ? 'doodle-idle-bounce' : ''
          } ${isClicked ? 'doodle-click-explode' : ''}`}
          style={{
            background: `radial-gradient(circle at center, ${theme.colors.primary} 0%, ${theme.colors.secondary} 50%, #7C3AED 100%)`,
            border: '2px solid rgba(255,255,255,0.5)',
            boxShadow: `0 0 ${config.glowSize} ${theme.colors.glow}, 0 0 15px ${theme.colors.secondary}80`,
            transform: isWinking && !delayed ? 'scaleY(0.1)' : 'scaleY(1)',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* Burst rays */}
          {shouldAnimate && (
            <span className="absolute inset-0 rounded-full overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <span
                  key={i}
                  className="absolute w-0.5 h-full left-1/2 top-0 -translate-x-1/2 origin-bottom doodle-ray-pulse"
                  style={{
                    transform: `translateX(-50%) rotate(${i * 45}deg)`,
                    background: `linear-gradient(to top, transparent 40%, ${theme.colors.primary}80 70%, ${theme.colors.secondary} 100%)`,
                    animationDelay: `${delayed ? 0.5 : 0}s`,
                  }}
                />
              ))}
            </span>
          )}

          {/* Sparkle particles */}
          {shouldAnimate && (
            <span className="absolute inset-0">
              {[...Array(6)].map((_, i) => (
                <span
                  key={i}
                  className="absolute w-1 h-1 rounded-full doodle-sparkle-particle"
                  style={{
                    background: i % 2 === 0 ? theme.colors.primary : theme.colors.secondary,
                    boxShadow: `0 0 4px ${i % 2 === 0 ? theme.colors.primary : theme.colors.secondary}`,
                    top: `${20 + Math.random() * 60}%`,
                    left: `${20 + Math.random() * 60}%`,
                    animationDelay: `${(delayed ? 0.5 : 0) + i * 0.2}s`,
                  }}
                />
              ))}
            </span>
          )}

          {/* Inner glow */}
          <span
            className={`${config.eyeMiddle} rounded-full flex items-center justify-center relative z-10`}
            style={{
              background: `radial-gradient(circle at center, #FFFFFF 0%, ${theme.colors.primary} 50%, ${theme.colors.secondary} 100%)`,
              boxShadow: `inset 0 0 8px rgba(255,255,255,0.5)`,
            }}
          >
            {/* Core burst */}
            <span
              className={`${config.eyeInner} rounded-full flex items-center justify-center`}
              style={{
                background: `radial-gradient(circle at center, #FFFFFF 0%, ${theme.colors.primary} 60%, ${theme.colors.secondary} 100%)`,
                boxShadow: `0 0 10px ${theme.colors.glow}`,
              }}
            >
              <span
                className={`${config.coreSize} rounded-full ${shouldAnimate ? 'cyber-core-pulse' : ''}`}
                style={{
                  background: 'radial-gradient(circle at center, #FFFFFF 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                  boxShadow: '0 0 12px rgba(255, 255, 255, 1)',
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
