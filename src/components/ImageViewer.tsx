'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface ImageViewerProps {
  imageUrls: string[]
  currentIndex?: number
  alt?: string
  onClose: () => void
}

export default function ImageViewer({ imageUrls, currentIndex = 0, alt, onClose }: ImageViewerProps) {
  const [activeIndex, setActiveIndex] = useState(currentIndex)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageError, setImageError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastTouchDistance = useRef<number | null>(null)
  const lastTapTime = useRef<number>(0)

  const isAlbum = imageUrls.length > 1
  const baseUrl = imageUrls[activeIndex]
  // Add cache-busting on retry
  const currentUrl = retryKey > 0 ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : baseUrl

  // Reset zoom and position when changing images
  const resetZoom = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  // Reset error state when changing images
  useEffect(() => {
    setImageError(false)
    setRetryKey(0)
  }, [activeIndex])

  const handleImageError = () => {
    setImageError(true)
  }

  const handleRetry = () => {
    setImageError(false)
    setRetryKey((prev) => prev + 1)
  }

  // Reset position when scale changes to 1
  useEffect(() => {
    if (scale === 1) {
      setPosition({ x: 0, y: 0 })
    }
  }, [scale])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && activeIndex > 0) {
        resetZoom()
        setActiveIndex((prev) => prev - 1)
      } else if (e.key === 'ArrowRight' && activeIndex < imageUrls.length - 1) {
        resetZoom()
        setActiveIndex((prev) => prev + 1)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, imageUrls.length, onClose, resetZoom])

  const goToPrevious = () => {
    if (activeIndex > 0) {
      resetZoom()
      setActiveIndex((prev) => prev - 1)
    }
  }

  const goToNext = () => {
    if (activeIndex < imageUrls.length - 1) {
      resetZoom()
      setActiveIndex((prev) => prev + 1)
    }
  }

  // Handle scroll wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale((prev) => Math.min(Math.max(prev + delta, 1), 4))
  }

  // Handle pinch zoom and double-tap
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      lastTouchDistance.current = distance
    } else if (e.touches.length === 1) {
      // Check for double-tap
      const now = Date.now()
      if (now - lastTapTime.current < 300) {
        // Double tap detected
        if (scale === 1) {
          setScale(2)
        } else {
          setScale(1)
          setPosition({ x: 0, y: 0 })
        }
        lastTapTime.current = 0
      } else {
        lastTapTime.current = now
        // Start drag if zoomed
        if (scale > 1) {
          setIsDragging(true)
          setDragStart({
            x: e.touches[0].clientX - position.x,
            y: e.touches[0].clientY - position.y,
          })
        }
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const delta = (distance - lastTouchDistance.current) * 0.01
      setScale((prev) => Math.min(Math.max(prev + delta, 1), 4))
      lastTouchDistance.current = distance
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      })
    }
  }

  const handleTouchEnd = () => {
    lastTouchDistance.current = null
    setIsDragging(false)
  }

  // Handle mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Double tap/click to zoom
  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2)
    } else {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }

  // Close on background click (only when not zoomed)
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current && scale === 1) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" onWheel={handleWheel}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <button
          onClick={onClose}
          className="text-white p-2 hover:bg-white/10 rounded-full transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Counter for albums */}
        {isAlbum && (
          <div className="text-white text-sm font-medium">
            {activeIndex + 1} / {imageUrls.length}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setScale((prev) => Math.min(prev + 0.5, 4))}
            className="text-white p-2 hover:bg-white/10 rounded-full transition"
            disabled={scale >= 4}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
          </button>
          <button
            onClick={() => setScale((prev) => Math.max(prev - 0.5, 1))}
            className="text-white p-2 hover:bg-white/10 rounded-full transition"
            disabled={scale <= 1}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing touch-none"
        onClick={handleBackgroundClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        {imageError ? (
          <div className="flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRetry()
              }}
              className="bg-white/20 hover:bg-white/30 rounded-full p-4 transition mb-2"
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <span className="text-sm text-white/80">Tap to retry</span>
          </div>
        ) : (
          <img
            key={retryKey}
            src={currentUrl}
            alt={alt || `Image ${activeIndex + 1}`}
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            }}
            draggable={false}
            onError={handleImageError}
          />
        )}
      </div>

      {/* Navigation arrows for albums */}
      {isAlbum && scale === 1 && (
        <>
          {activeIndex > 0 && (
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          {activeIndex < imageUrls.length - 1 && (
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </>
      )}

      {/* Dot indicators for albums */}
      {isAlbum && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
          {imageUrls.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                resetZoom()
                setActiveIndex(idx)
              }}
              className={`w-2 h-2 rounded-full transition ${
                idx === activeIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Zoom indicator */}
      {scale > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 text-white/50 text-xs">
        {isAlbum ? 'Swipe or use arrows to navigate' : 'Double-tap to zoom'}
      </div>
    </div>
  )
}
