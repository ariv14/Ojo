'use client'

import { useState, useEffect } from 'react'

// All the fun animations the J can do
const jAnimations = [
  'j-jitter',  // nervous shake
  'j-bounce',  // bouncing up and down
  'j-spin',    // 360° rotation
  'j-squish',  // cartoon squash and stretch
  'j-wave',    // tilting side to side
  'j-lean',    // leaning away from eyes
  'j-wiggle',  // side to side dance
  'j-flip',    // horizontal flip
  'j-pulse',   // scale up and down
  'j-peek',    // drops down then pops back up
]

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  className?: string
}

const sizeConfig = {
  sm: {
    text: 'text-xl',
    eyeSize: 'w-5 h-5',
    irisSize: 'w-4 h-4',
    pupilSize: 'w-1.5 h-1.5',
    reflectionSize: 'w-0.5 h-0.5',
    reflectionOffset: '-top-0.5 -right-0.5',
  },
  md: {
    text: 'text-2xl',
    eyeSize: 'w-6 h-6',
    irisSize: 'w-5 h-5',
    pupilSize: 'w-2 h-2',
    reflectionSize: 'w-0.5 h-0.5',
    reflectionOffset: '-top-0.5 -right-0.5',
  },
  lg: {
    text: 'text-4xl',
    eyeSize: 'w-8 h-8',
    irisSize: 'w-6 h-6',
    pupilSize: 'w-2.5 h-2.5',
    reflectionSize: 'w-1 h-1',
    reflectionOffset: '-top-0.5 -right-0.5',
  },
  xl: {
    text: 'text-6xl',
    eyeSize: 'w-12 h-12',
    irisSize: 'w-9 h-9',
    pupilSize: 'w-4 h-4',
    reflectionSize: 'w-1.5 h-1.5',
    reflectionOffset: '-top-1 -right-1',
  },
}

export default function Logo({ size = 'lg', animated = true, className = '' }: LogoProps) {
  const config = sizeConfig[size]
  const [currentAnimation, setCurrentAnimation] = useState(0)

  // Cycle through animations every 2 seconds
  useEffect(() => {
    if (!animated) return

    const interval = setInterval(() => {
      setCurrentAnimation(prev => (prev + 1) % jAnimations.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [animated])

  const Eye = ({ delayed = false }: { delayed?: boolean }) => (
    <span className="relative inline-flex items-center justify-center">
      {/* The letter O as the sclera outline */}
      <span className="opacity-0">O</span>

      {/* Eye container - positioned over the O */}
      <span className="absolute inset-0 flex items-center justify-center">
        {/* Sclera (white of the eye) - animation applied here */}
        <span
          className={`${config.eyeSize} rounded-full bg-white flex items-center justify-center shadow-inner ${animated ? (delayed ? 'eye-blink-delayed' : 'eye-blink') : ''}`}
          style={{
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {/* Iris with gradient rings */}
          <span
            className={`${config.irisSize} rounded-full flex items-center justify-center`}
            style={{
              background: 'radial-gradient(circle at center, #1e3a5f 0%, #2563eb 30%, #3b82f6 50%, #60a5fa 70%, #93c5fd 85%, #2563eb 100%)',
              boxShadow: 'inset 0 0 3px rgba(0,0,0,0.3)'
            }}
          >
            {/* Pupil */}
            <span
              className={`${config.pupilSize} rounded-full bg-black ${animated ? 'pupil-pulse' : ''} relative`}
            >
              {/* Light reflection */}
              <span
                className={`absolute ${config.reflectionSize} ${config.reflectionOffset} bg-white rounded-full opacity-90`}
              />
            </span>
          </span>
        </span>
      </span>
    </span>
  )

  return (
    <span className={`${config.text} font-bold flex items-center ${className}`}>
      <Eye delayed={false} />
      <span
        className={`mx-1 ${animated ? jAnimations[currentAnimation] : ''}`}
        style={{
          background: 'linear-gradient(180deg, #2563eb 0%, #3b82f6 50%, #1e3a5f 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        J
      </span>
      <Eye delayed={true} />
    </span>
  )
}
