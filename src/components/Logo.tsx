'use client'

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

  const Eye = ({ delayed = false }: { delayed?: boolean }) => (
    <span className="relative inline-flex items-center justify-center">
      {/* The letter O as the sclera outline */}
      <span className="opacity-0">O</span>

      {/* Eye container - positioned over the O */}
      <span
        className={`absolute inset-0 flex items-center justify-center ${animated ? (delayed ? 'eye-blink-delayed' : 'eye-blink') : ''}`}
      >
        {/* Sclera (white of the eye) */}
        <span
          className={`${config.eyeSize} rounded-full bg-white flex items-center justify-center shadow-inner`}
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
      <span className="mx-[-0.1em]">J</span>
      <Eye delayed={true} />
    </span>
  )
}
