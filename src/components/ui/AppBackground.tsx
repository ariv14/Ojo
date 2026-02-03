'use client'

import { ReactNode } from 'react'

interface AppBackgroundProps {
  children: ReactNode
  /** 'animated' for mesh gradient animation, 'static' for performance-friendly static gradient */
  variant?: 'animated' | 'static'
  /** Whether to show decorative floating orbs */
  showOrbs?: boolean
}

export default function AppBackground({
  children,
  variant = 'animated',
  showOrbs = true
}: AppBackgroundProps) {
  const gradientClass = variant === 'animated' ? 'bg-mesh-gradient' : 'bg-mesh-gradient-static'

  return (
    <div className={`min-h-screen ${gradientClass} relative overflow-hidden`}>
      {/* Decorative floating orbs */}
      {showOrbs && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-64 h-64 rounded-full opacity-30 blur-3xl"
            style={{
              background: 'radial-gradient(circle, var(--oro-cyan) 0%, transparent 70%)',
              top: '-10%',
              right: '-10%',
            }}
          />
          <div
            className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
            style={{
              background: 'radial-gradient(circle, var(--oro-purple-light) 0%, transparent 70%)',
              bottom: '10%',
              left: '-15%',
            }}
          />
          <div
            className="absolute w-48 h-48 rounded-full opacity-25 blur-2xl"
            style={{
              background: 'radial-gradient(circle, var(--oro-orange-light) 0%, transparent 70%)',
              top: '40%',
              right: '5%',
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
