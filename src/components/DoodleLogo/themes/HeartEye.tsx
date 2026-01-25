'use client'

import { EyeProps } from '@/lib/doodle/types'
import { sizeConfig } from '../sizeConfig'

export default function HeartEye({ size, offset, isWinking, isClicked, shouldAnimate, delayed, theme }: EyeProps) {
  const config = sizeConfig[size]
  const sizePx = config.eyeOuterPx

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
        {/* Heart shape using SVG */}
        <span
          className={`flex items-center justify-center relative ${
            shouldAnimate ? 'doodle-heart-beat' : ''
          } ${isClicked ? 'doodle-click-explode' : ''}`}
          style={{
            width: sizePx,
            height: sizePx,
            transform: isWinking && !delayed ? 'scaleY(0.1)' : 'scaleY(1)',
            transition: 'transform 0.1s ease-out',
            animationDelay: delayed ? '0.5s' : '0s',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-full h-full"
            style={{
              filter: `drop-shadow(0 0 ${config.glowSize} ${theme.colors.glow})`,
            }}
          >
            <defs>
              <linearGradient id={`heartGrad${delayed ? '2' : '1'}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={theme.colors.secondary} />
                <stop offset="100%" stopColor={theme.colors.primary} />
              </linearGradient>
              <radialGradient id={`heartShine${delayed ? '2' : '1'}`} cx="30%" cy="30%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill={`url(#heartGrad${delayed ? '2' : '1'})`}
            />
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill={`url(#heartShine${delayed ? '2' : '1'})`}
            />
          </svg>

          {/* Center pupil */}
          <span
            className={`absolute ${config.coreSize} rounded-full ${shouldAnimate ? 'cyber-core-pulse' : ''}`}
            style={{
              background: 'radial-gradient(circle at center, #FFFFFF 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
              boxShadow: '0 0 6px rgba(255, 255, 255, 0.8)',
              top: '45%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animationDelay: delayed ? '1s' : '0s',
            }}
          />
        </span>
      </span>
    </span>
  )
}
