'use client'

import { EyeProps } from '@/lib/doodle/types'
import { sizeConfig } from '../sizeConfig'

export default function PumpkinEye({ size, offset, isWinking, isClicked, shouldAnimate, delayed, theme }: EyeProps) {
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
        {/* Jack-o-lantern eye (triangle shape) */}
        <span
          className={`flex items-center justify-center relative ${
            shouldAnimate ? 'doodle-idle-flicker' : ''
          } ${isClicked ? 'doodle-click-glow' : ''}`}
          style={{
            width: sizePx,
            height: sizePx,
            transform: isWinking && !delayed ? 'scaleY(0.1)' : 'scaleY(1)',
            transition: 'transform 0.1s ease-out',
          }}
        >
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <defs>
              <linearGradient id={`pumpkinGrad${delayed ? '2' : '1'}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={theme.colors.primary} />
                <stop offset="100%" stopColor="#C2410C" />
              </linearGradient>
              <filter id={`pumpkinGlow${delayed ? '2' : '1'}`}>
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Pumpkin body (circle) */}
            <circle
              cx="12"
              cy="12"
              r="10"
              fill={`url(#pumpkinGrad${delayed ? '2' : '1'})`}
              stroke={theme.colors.secondary}
              strokeWidth="1"
              style={{
                filter: `drop-shadow(0 0 ${config.glowSize} ${theme.colors.glow})`,
              }}
            />
            {/* Pumpkin ridges */}
            <path
              d="M12 2 Q8 12 12 22 M12 2 Q16 12 12 22"
              fill="none"
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="0.5"
            />
            {/* Carved triangle eye */}
            <path
              d="M8 8 L12 14 L16 8 Z"
              fill="#0F172A"
              filter={`url(#pumpkinGlow${delayed ? '2' : '1'})`}
            />
            {/* Inner glow (flame) */}
            <path
              d="M9 9 L12 13 L15 9 Z"
              fill={theme.colors.secondary}
              opacity="0.8"
              className={shouldAnimate ? 'doodle-flame-flicker-svg' : ''}
              style={{ animationDelay: delayed ? '0.5s' : '0s' }}
            />
          </svg>

          {/* Flame effect inside */}
          <span
            className={`absolute ${config.coreSize} ${shouldAnimate ? 'doodle-flame-flicker' : ''}`}
            style={{
              background: `radial-gradient(circle at center, ${theme.colors.secondary} 0%, ${theme.colors.primary} 50%, transparent 100%)`,
              boxShadow: `0 0 8px ${theme.colors.secondary}`,
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animationDelay: delayed ? '0.3s' : '0s',
            }}
          />
        </span>

        {/* Stem */}
        <span
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-2 rounded-t-sm"
          style={{
            background: theme.colors.secondary,
          }}
        />
      </span>
    </span>
  )
}
