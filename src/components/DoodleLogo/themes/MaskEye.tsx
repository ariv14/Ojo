'use client'

import { EyeProps } from '@/lib/doodle/types'
import { sizeConfig } from '../sizeConfig'

export default function MaskEye({ size, offset, isWinking, isClicked, shouldAnimate, delayed, theme }: EyeProps) {
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
        {/* Mask eye shape (almond/cat-eye) */}
        <span
          className={`flex items-center justify-center relative ${
            shouldAnimate ? 'doodle-idle-bob' : ''
          } ${isClicked ? 'doodle-click-spin' : ''}`}
          style={{
            width: config.eyeOuterPx,
            height: config.eyeOuterPx * 0.7,
            borderRadius: '50% / 40%',
            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 50%, #F472B6 100%)`,
            border: '2px solid rgba(255,255,255,0.5)',
            boxShadow: `0 0 ${config.glowSize} ${theme.colors.glow}, inset 0 0 8px rgba(255,255,255,0.3)`,
            transform: isWinking && !delayed ? 'scaleY(0.1)' : 'scaleY(1)',
            transition: 'transform 0.1s ease-out',
            animationDelay: delayed ? '0.3s' : '0s',
          }}
        >
          {/* Glitter effect */}
          <span
            className={`absolute inset-0 ${shouldAnimate ? 'doodle-sparkle' : ''}`}
            style={{
              borderRadius: 'inherit',
              background: `
                radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 0%, transparent 20%),
                radial-gradient(circle at 80% 40%, rgba(255,255,255,0.6) 0%, transparent 15%),
                radial-gradient(circle at 50% 70%, rgba(255,255,255,0.5) 0%, transparent 15%)
              `,
            }}
          />

          {/* Inner eye */}
          <span
            className={`${config.eyeMiddle} rounded-full flex items-center justify-center relative z-10`}
            style={{
              background: `radial-gradient(circle at center, #1F2937 0%, #111827 100%)`,
              boxShadow: 'inset 0 0 4px rgba(0,0,0,0.5)',
            }}
          >
            {/* Colorful iris */}
            <span
              className={`${config.eyeInner} rounded-full flex items-center justify-center`}
              style={{
                background: `conic-gradient(from 0deg, ${theme.colors.primary}, ${theme.colors.secondary}, #F472B6, #22D3EE, ${theme.colors.primary})`,
                boxShadow: `0 0 4px ${theme.colors.glow}`,
              }}
            >
              {/* Pupil */}
              <span
                className={`${config.coreSize} rounded-full ${shouldAnimate ? 'cyber-core-pulse' : ''}`}
                style={{
                  background: '#000000',
                  boxShadow: '0 0 4px rgba(255,255,255,0.5)',
                  animationDelay: delayed ? '1s' : '0s',
                }}
              />
            </span>
          </span>
        </span>

        {/* Feather decoration (top) */}
        {!delayed && (
          <span
            className={`absolute -top-2 -right-1 ${shouldAnimate ? 'doodle-feather-wave' : ''}`}
            style={{ transform: 'rotate(30deg)' }}
          >
            <svg viewBox="0 0 24 24" className="w-3 h-4" fill={theme.colors.secondary}>
              <path d="M12 2C9 6 8 10 8 14c0 2 1 4 4 6 3-2 4-4 4-6 0-4-1-8-4-12z" />
            </svg>
          </span>
        )}
      </span>
    </span>
  )
}
