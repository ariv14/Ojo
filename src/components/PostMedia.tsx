'use client'

import { useState, useRef, useEffect } from 'react'
import { getS3PublicUrl } from '@/lib/s3'
import SafeVideoPlayer, { SafeVideoPlayerRef } from '@/components/SafeVideoPlayer'

interface MediaUrl {
  key: string
  type: string
}

interface Post {
  id: string
  media_type?: 'image' | 'album' | 'reel'
  image_url?: string
  media_urls?: MediaUrl[]
  thumbnail_url?: string
  is_premium: boolean
  has_access: boolean
  caption?: string | null
  users?: {
    wallet_address: string | null
  }
  localBlobs?: {
    localImageUrl?: string
    localMediaUrls?: string[]
    localVideoUrl?: string
    localThumbnailUrl?: string
  }
}

interface PostMediaProps {
  post: Post
  onImageClick?: (urls: string[], index: number) => void
  onUnlock?: (post: Post) => void
  onMediaLoaded?: (postId: string) => void
}

// Skeleton loader for media
function MediaSkeleton() {
  return (
    <div className="w-full aspect-square bg-gray-900 animate-pulse flex items-center justify-center min-h-[300px]">
      <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  )
}

export default function PostMedia({ post, onImageClick, onUnlock, onMediaLoaded }: PostMediaProps) {
  const isPremiumLocked = post.is_premium && !post.has_access
  const hasWallet = post.users?.wallet_address

  // Legacy single image (backward compatibility)
  if (!post.media_type || post.media_type === 'image') {
    return (
      <SingleImage
        url={post.image_url || ''}
        localUrl={post.localBlobs?.localImageUrl}
        caption={post.caption}
        locked={isPremiumLocked}
        hasWallet={!!hasWallet}
        onImageClick={() => {
          if (!isPremiumLocked && post.image_url) {
            onImageClick?.([post.image_url], 0)
          }
        }}
        onUnlock={() => onUnlock?.(post)}
        onLoaded={() => onMediaLoaded?.(post.id)}
      />
    )
  }

  // Album with carousel
  if (post.media_type === 'album' && post.media_urls) {
    return (
      <AlbumCarousel
        mediaKeys={post.media_urls}
        localUrls={post.localBlobs?.localMediaUrls}
        caption={post.caption}
        locked={isPremiumLocked}
        hasWallet={!!hasWallet}
        onImageClick={(index) => {
          // Transform URLs only when needed for image viewer
          const urls = post.media_urls!.map((m) => getS3PublicUrl(m.key))
          onImageClick?.(urls, index)
        }}
        onUnlock={() => onUnlock?.(post)}
        onLoaded={() => onMediaLoaded?.(post.id)}
      />
    )
  }

  // Reel with video player
  if (post.media_type === 'reel' && post.media_urls && post.media_urls.length > 0) {
    const videoUrl = getS3PublicUrl(post.media_urls[0].key)
    const thumbnailUrl = post.thumbnail_url ? getS3PublicUrl(post.thumbnail_url) : undefined
    return (
      <ReelPlayer
        videoUrl={videoUrl}
        localVideoUrl={post.localBlobs?.localVideoUrl}
        thumbnailUrl={thumbnailUrl}
        localThumbnailUrl={post.localBlobs?.localThumbnailUrl}
        locked={isPremiumLocked}
        hasWallet={!!hasWallet}
        onUnlock={() => onUnlock?.(post)}
        onLoaded={() => onMediaLoaded?.(post.id)}
      />
    )
  }

  // Fallback for unknown media types
  return null
}

// Single Image Component
interface SingleImageProps {
  url: string
  localUrl?: string
  caption?: string | null
  locked: boolean
  hasWallet: boolean
  onImageClick: () => void
  onUnlock: () => void
  onLoaded?: () => void
}

function SingleImage({ url, localUrl, caption, locked, hasWallet, onImageClick, onUnlock, onLoaded }: SingleImageProps) {
  const [isLoading, setIsLoading] = useState(!localUrl)
  const hasCalledLoaded = useRef(false)

  const displayUrl = localUrl || url

  const handleImageLoad = () => {
    setIsLoading(false)
    // Only call onLoaded when remote image loads (not local blob)
    // This signals that CDN content is ready and local blob can be cleaned up
    if (!localUrl && !hasCalledLoaded.current && onLoaded) {
      hasCalledLoaded.current = true
      onLoaded()
    }
  }

  return (
    <div className="relative min-h-[300px] bg-black">
      {isLoading && !localUrl && <MediaSkeleton />}
      <button
        type="button"
        onClick={() => {
          if (!locked) {
            window.history.pushState(null, '', '#view')
            onImageClick()
          }
        }}
        className={`w-full block ${isLoading && !localUrl ? 'hidden' : ''}`}
      >
        <img
          src={displayUrl}
          alt={caption || 'Post image'}
          loading="lazy"
          decoding="async"
          onLoad={handleImageLoad}
          className={`w-full max-h-[450px] md:max-h-[600px] object-contain bg-black ${
            locked ? 'blur-xl' : ''
          }`}
        />
      </button>

      {locked && (
        <PremiumOverlay hasWallet={hasWallet} onUnlock={onUnlock} />
      )}
    </div>
  )
}

// Album Carousel Component
interface AlbumCarouselProps {
  mediaKeys: MediaUrl[]
  localUrls?: string[]
  caption?: string | null
  locked: boolean
  hasWallet: boolean
  onImageClick: (index: number) => void
  onUnlock: () => void
  onLoaded?: () => void
}

function AlbumCarousel({
  mediaKeys,
  localUrls,
  caption,
  locked,
  hasWallet,
  onImageClick,
  onUnlock,
  onLoaded,
}: AlbumCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(new Set(localUrls ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : []))
  // Cache transformed URLs to avoid re-computing
  const [transformedUrls, setTransformedUrls] = useState<Map<number, string>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const hasCalledLoaded = useRef(false)

  // Lazily transform URLs for current and adjacent slides only
  useEffect(() => {
    const indicesToLoad = [currentIndex]
    // Preload next slide for smooth transitions
    if (currentIndex < mediaKeys.length - 1) {
      indicesToLoad.push(currentIndex + 1)
    }
    // Preload previous slide
    if (currentIndex > 0) {
      indicesToLoad.push(currentIndex - 1)
    }

    setTransformedUrls(prev => {
      const updated = new Map(prev)
      let changed = false
      for (const idx of indicesToLoad) {
        if (!updated.has(idx)) {
          updated.set(idx, getS3PublicUrl(mediaKeys[idx].key))
          changed = true
        }
      }
      return changed ? updated : prev
    })
  }, [currentIndex, mediaKeys])

  // Get display URL for current index (prefer local if available)
  const getDisplayUrl = (index: number) => {
    if (localUrls && localUrls[index]) {
      return localUrls[index]
    }
    // Return cached transformed URL or transform on demand
    return transformedUrls.get(index) || getS3PublicUrl(mediaKeys[index].key)
  }

  const handleImageLoad = (index: number) => {
    setLoadedIndices(prev => new Set([...prev, index]))
    // Call onLoaded when first remote image loads (signals CDN is ready)
    if (!localUrls && !hasCalledLoaded.current && onLoaded) {
      hasCalledLoaded.current = true
      onLoaded()
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (locked) return
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (locked) return
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (locked) return
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < mediaKeys.length - 1) {
        setCurrentIndex((prev) => prev + 1)
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1)
      }
    }
  }

  const goToPrevious = () => {
    if (!locked && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const goToNext = () => {
    if (!locked && currentIndex < mediaKeys.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const isCurrentLoaded = loadedIndices.has(currentIndex) || !!localUrls

  return (
    <div className="relative min-h-[300px] bg-black">
      {/* Counter badge */}
      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
        {currentIndex + 1}/{mediaKeys.length}
      </div>

      {/* Album badge */}
      <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10 flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
        </svg>
        Album
      </div>

      {/* Skeleton when loading */}
      {!isCurrentLoaded && <MediaSkeleton />}

      {/* Image container */}
      <div
        ref={containerRef}
        className={`overflow-hidden ${!isCurrentLoaded ? 'hidden' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          onClick={() => {
            if (!locked) {
              window.history.pushState(null, '', '#view')
              onImageClick(currentIndex)
            }
          }}
          className="w-full block"
        >
          <img
            src={locked ? getDisplayUrl(0) : getDisplayUrl(currentIndex)}
            alt={caption || `Album image ${currentIndex + 1}`}
            loading="lazy"
            decoding="async"
            onLoad={() => handleImageLoad(currentIndex)}
            className={`w-full max-h-[450px] md:max-h-[600px] object-contain bg-black transition-opacity duration-200 ${
              locked ? 'blur-xl' : ''
            }`}
          />
        </button>
      </div>

      {/* Navigation arrows (hidden when locked) */}
      {!locked && mediaKeys.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {currentIndex < mediaKeys.length - 1 && (
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </>
      )}

      {/* Dot indicators */}
      {mediaKeys.length > 1 && !locked && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {mediaKeys.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition ${
                idx === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {locked && (
        <PremiumOverlay hasWallet={hasWallet} onUnlock={onUnlock} />
      )}
    </div>
  )
}

// Reel Player Component
interface ReelPlayerProps {
  videoUrl: string
  localVideoUrl?: string
  thumbnailUrl?: string
  localThumbnailUrl?: string
  locked: boolean
  hasWallet: boolean
  onUnlock: () => void
  onLoaded?: () => void
}

function ReelPlayer({ videoUrl, localVideoUrl, thumbnailUrl, localThumbnailUrl, locked, hasWallet, onUnlock, onLoaded }: ReelPlayerProps) {
  const videoRef = useRef<SafeVideoPlayerRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isVideoReady, setIsVideoReady] = useState(!!localVideoUrl)
  const [showMuteHint, setShowMuteHint] = useState(true)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const hasCalledLoaded = useRef(false)

  // Use local URLs if available, otherwise use remote
  const displayVideoUrl = localVideoUrl || videoUrl
  const displayThumbnailUrl = localThumbnailUrl || thumbnailUrl

  // Hide mute hint after 3 seconds when video is playing
  useEffect(() => {
    if (showMuteHint && isVideoReady && isPlaying) {
      const timer = setTimeout(() => setShowMuteHint(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showMuteHint, isVideoReady, isPlaying])

  // Reset mute hint when video starts playing again after being paused
  useEffect(() => {
    if (isPlaying && isMuted) {
      setShowMuteHint(true)
    }
  }, [isPlaying, isMuted])

  // Auto-play when 50% visible using IntersectionObserver
  useEffect(() => {
    if (locked) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            videoRef.current?.play().catch(() => {
              // Autoplay may be blocked
              setAutoplayBlocked(true)
            })
          } else {
            videoRef.current?.pause()
          }
        })
      },
      { threshold: 0.5 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [locked])

  const handleVideoCanPlay = () => {
    setIsVideoReady(true)
    // Call onLoaded when remote video is ready (not local blob)
    if (!localVideoUrl && !hasCalledLoaded.current && onLoaded) {
      hasCalledLoaded.current = true
      onLoaded()
    }
  }

  const togglePlay = () => {
    if (locked) return

    if (isPlaying) {
      videoRef.current?.pause()
    } else {
      videoRef.current?.play()
      setAutoplayBlocked(false)
    }
  }

  const handleToggleMute = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      const newMutedState = await videoRef.current.toggleMute()
      setIsMuted(newMutedState)
      if (!newMutedState) {
        setShowMuteHint(false) // Hide hint when user unmutes
      }
    }
  }

  const handlePlay = () => {
    setIsPlaying(true)
    setAutoplayBlocked(false)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleAutoplayBlocked = () => {
    setAutoplayBlocked(true)
  }

  return (
    <div ref={containerRef} className="relative bg-black min-h-[300px]">
      {/* Reel badge */}
      <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10 flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
        Reel
      </div>

      {locked ? (
        // Show blurred thumbnail when locked - don't load video
        <div className="relative">
          <img
            src={displayThumbnailUrl || ''}
            alt="Reel thumbnail"
            className="w-full max-h-[450px] md:max-h-[600px] object-contain blur-xl"
          />
          <PremiumOverlay hasWallet={hasWallet} onUnlock={onUnlock} />
        </div>
      ) : (
        // Show video player when unlocked
        <div className="relative">
          {/* Skeleton while video loads */}
          {!isVideoReady && <MediaSkeleton />}

          <SafeVideoPlayer
            ref={videoRef}
            src={displayVideoUrl}
            poster={displayThumbnailUrl}
            muted={isMuted}
            loop
            className={`w-full max-h-[450px] md:max-h-[600px] object-contain ${!isVideoReady ? 'hidden' : ''}`}
            onClick={togglePlay}
            onCanPlay={handleVideoCanPlay}
            onPlay={handlePlay}
            onPause={handlePause}
            onAutoplayBlocked={handleAutoplayBlocked}
          />

          {/* Play/Pause overlay - show when paused or autoplay blocked */}
          {((!isPlaying && isVideoReady) || autoplayBlocked) && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20"
            >
              <div className="bg-black/60 rounded-full p-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </div>
            </button>
          )}

          {/* Mute toggle button */}
          {isVideoReady && (
            <button
              type="button"
              onClick={handleToggleMute}
              className={`absolute bottom-3 right-3 bg-black/60 text-white p-2 rounded-full z-10 ${
                isMuted && isPlaying ? 'animate-pulse' : ''
              }`}
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
          )}

          {/* Tap to unmute hint */}
          {isVideoReady && isMuted && isPlaying && showMuteHint && (
            <div
              className="absolute bottom-12 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded z-10 animate-pulse"
              onClick={handleToggleMute}
            >
              Tap to unmute
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Premium Overlay Component
interface PremiumOverlayProps {
  hasWallet: boolean
  onUnlock: () => void
}

function PremiumOverlay({ hasWallet, onUnlock }: PremiumOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
      {hasWallet ? (
        <button
          onClick={onUnlock}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-full shadow-lg transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Unlock for 1.0 WLD
        </button>
      ) : (
        <div className="bg-gray-600 text-white font-semibold px-6 py-3 rounded-full flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Premium Content
        </div>
      )}
    </div>
  )
}
