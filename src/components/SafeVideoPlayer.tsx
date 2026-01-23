'use client'

import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react'
import { safeUnmuteVideo } from '@/utils/audioUnlock'

export interface SafeVideoPlayerRef {
  play: () => Promise<void>
  pause: () => void
  toggleMute: () => Promise<boolean>
  getVideoElement: () => HTMLVideoElement | null
  isMuted: () => boolean
  isPlaying: () => boolean
}

interface SafeVideoPlayerProps {
  src: string
  poster?: string
  className?: string
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  onClick?: () => void
  onCanPlay?: () => void
  onPlay?: () => void
  onPause?: () => void
  onMuteChange?: (muted: boolean) => void
  onAutoplayBlocked?: () => void
}

/**
 * SafeVideoPlayer - iOS-safe video player component
 *
 * Features:
 * - All required attributes for iOS inline playback (playsInline, webkit-playsinline)
 * - AudioContext unlock pattern for reliable unmuting on iOS
 * - Autoplay blocked detection with callback
 * - Exposes ref with control methods
 */
const SafeVideoPlayer = forwardRef<SafeVideoPlayerRef, SafeVideoPlayerProps>(
  (
    {
      src,
      poster,
      className = '',
      autoPlay = false,
      loop = false,
      muted = true,
      onClick,
      onCanPlay,
      onPlay,
      onPause,
      onMuteChange,
      onAutoplayBlocked,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [internalMuted, setInternalMuted] = useState(muted)
    const [internalPlaying, setInternalPlaying] = useState(false)

    // Sync muted state with prop
    useEffect(() => {
      setInternalMuted(muted)
      if (videoRef.current) {
        videoRef.current.muted = muted
      }
    }, [muted])

    // Handle autoplay
    useEffect(() => {
      if (autoPlay && videoRef.current) {
        videoRef.current.play().catch(() => {
          // Autoplay was blocked
          onAutoplayBlocked?.()
        })
      }
    }, [autoPlay, onAutoplayBlocked])

    // Expose control methods via ref
    useImperativeHandle(ref, () => ({
      play: async () => {
        if (videoRef.current) {
          try {
            await videoRef.current.play()
            setInternalPlaying(true)
          } catch {
            onAutoplayBlocked?.()
          }
        }
      },
      pause: () => {
        if (videoRef.current) {
          videoRef.current.pause()
          setInternalPlaying(false)
        }
      },
      toggleMute: async () => {
        if (!videoRef.current) return internalMuted

        if (internalMuted) {
          // Unmuting - use safe unmute with AudioContext unlock
          const success = await safeUnmuteVideo(videoRef.current)
          if (success) {
            setInternalMuted(false)
            onMuteChange?.(false)
            return false
          }
          return true // Still muted
        } else {
          // Muting - simple operation
          videoRef.current.muted = true
          setInternalMuted(true)
          onMuteChange?.(true)
          return true
        }
      },
      getVideoElement: () => videoRef.current,
      isMuted: () => internalMuted,
      isPlaying: () => internalPlaying,
    }))

    const handlePlay = () => {
      setInternalPlaying(true)
      onPlay?.()
    }

    const handlePause = () => {
      setInternalPlaying(false)
      onPause?.()
    }

    return (
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={className}
        muted={internalMuted}
        loop={loop}
        playsInline
        // iOS-specific attributes for inline playback
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        onCanPlay={onCanPlay}
        onPlay={handlePlay}
        onPause={handlePause}
        onClick={onClick}
      />
    )
  }
)

SafeVideoPlayer.displayName = 'SafeVideoPlayer'

export default SafeVideoPlayer
