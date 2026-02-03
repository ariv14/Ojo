'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getCurrentHoliday, getHolidayById, getThemeForHoliday, HolidayId, Holiday, Theme } from '@/lib/doodle'
import { sizeConfig } from './sizeConfig'
import DoodleEye from './DoodleEye'
import DoodleJ from './DoodleJ'
import DoodleTooltip from './DoodleTooltip'
import DoodleFilters from './DoodleFilters'

interface DoodleLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  className?: string
  previewHoliday?: HolidayId
  showTooltipOnTap?: boolean
}

export default function DoodleLogo({
  size = 'lg',
  animated = true,
  className = '',
  previewHoliday,
  showTooltipOnTap = false,
}: DoodleLogoProps) {
  const config = sizeConfig[size]
  const containerRef = useRef<HTMLSpanElement>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [isWinking, setIsWinking] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  // Holiday and theme detection
  const [holiday, setHoliday] = useState<Holiday>(() => {
    if (previewHoliday) {
      return getHolidayById(previewHoliday) || getCurrentHoliday()
    }
    return getCurrentHoliday()
  })
  const [theme, setTheme] = useState<Theme>(() => getThemeForHoliday(holiday.id))

  useEffect(() => {
    // Detect reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)

    // Detect touch device
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    // Update holiday/theme when previewHoliday changes
    const h = previewHoliday ? getHolidayById(previewHoliday) || getCurrentHoliday() : getCurrentHoliday()
    setHoliday(h)
    setTheme(getThemeForHoliday(h.id))
  }, [previewHoliday])

  const shouldAnimate = animated && !prefersReducedMotion

  // Cursor tracking with 3D rotation
  useEffect(() => {
    if (!shouldAnimate || isTouchDevice) return

    let rafId: number

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      rafId = requestAnimationFrame(() => {
        const rect = containerRef.current!.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2

        const dx = e.clientX - centerX
        const dy = e.clientY - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const maxDistance = 300

        if (distance < maxDistance) {
          const factor = Math.min(distance / maxDistance, 1) * config.maxOffset
          const angle = Math.atan2(dy, dx)
          setOffset({
            x: Math.cos(angle) * factor,
            y: Math.sin(angle) * factor,
          })

          // Calculate 3D rotation based on cursor position
          const rotationFactor = Math.min(distance / maxDistance, 1)
          setRotation({
            x: -(dy / maxDistance) * config.maxRotate * rotationFactor,
            y: (dx / maxDistance) * config.maxRotate * rotationFactor,
          })
        } else {
          setOffset({ x: 0, y: 0 })
          setRotation({ x: 0, y: 0 })
        }
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [shouldAnimate, isTouchDevice, config.maxOffset, config.maxRotate])

  // Random winking
  useEffect(() => {
    if (!shouldAnimate) return

    const scheduleWink = () => {
      const delay = 5000 + Math.random() * 10000 // 5-15 seconds
      return setTimeout(() => {
        setIsWinking(true)
        setTimeout(() => setIsWinking(false), 150)
        scheduleWink()
      }, delay)
    }

    const timeoutId = scheduleWink()
    return () => clearTimeout(timeoutId)
  }, [shouldAnimate])

  // Click handler
  const handleClick = useCallback(() => {
    if (shouldAnimate) {
      setIsClicked(true)
      setTimeout(() => setIsClicked(false), 500)
    }
    if (showTooltipOnTap) {
      setShowTooltip(true)
    }
  }, [shouldAnimate, showTooltipOnTap])

  // Hover handlers
  const handleMouseEnter = useCallback(() => {
    if (!isTouchDevice) {
      setIsHovered(true)
    }
  }, [isTouchDevice])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setRotation({ x: 0, y: 0 })
  }, [])

  const closeTooltip = useCallback(() => {
    setShowTooltip(false)
  }, [])

  const eyeProps = {
    size,
    offset,
    isWinking,
    isClicked,
    shouldAnimate,
    theme,
  }

  // Generate multi-layer depth shadow
  const generateDepthShadow = () => {
    const shadows = []
    for (let i = 1; i <= config.shadowLayers; i++) {
      const offset = i * 2
      const blur = i * 4
      const opacity = 0.3 - (i * 0.05)
      shadows.push(`${offset}px ${offset}px ${blur}px rgba(0, 0, 0, ${opacity})`)
    }
    return shadows.join(', ')
  }

  // Calculate 3D transform
  const get3DTransform = () => {
    const baseTransform = `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
    const hoverLift = isHovered ? `translateZ(${config.hoverLift}px)` : 'translateZ(0px)'
    const clickPop = isClicked ? 'scale(1.1)' : 'scale(1)'
    return `${baseTransform} ${hoverLift} ${clickPop}`
  }

  return (
    <span
      ref={containerRef}
      className={`${config.text} font-bold flex items-center relative cursor-pointer select-none ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="img"
      aria-label={`OJO logo - ${holiday.name}`}
      style={{
        perspective: `${config.perspective}px`,
        perspectiveOrigin: 'center',
      }}
    >
      {/* SVG Filters for doodle effects */}
      <DoodleFilters />

      {/* 3D transformed content */}
      <span
        className={`flex items-center ${shouldAnimate ? 'doodle-wobble' : ''}`}
        style={{
          transform: shouldAnimate ? get3DTransform() : undefined,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.15s ease-out',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          filter: `drop-shadow(${generateDepthShadow()})`,
        }}
      >
        <DoodleEye {...eyeProps} delayed={false} />
        <DoodleJ variant={theme.jVariant} theme={theme} shouldAnimate={shouldAnimate} />
        <DoodleEye {...eyeProps} delayed={true} />
      </span>

      {showTooltipOnTap && (
        <DoodleTooltip
          holiday={holiday}
          isVisible={showTooltip}
          onClose={closeTooltip}
        />
      )}
    </span>
  )
}
