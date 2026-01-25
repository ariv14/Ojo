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
  refreshKey?: number
  onImageClick?: (urls: string[], index: number) => void
  onUnlock?: (post: Post) => void
  onMediaLoaded?: (postId: string) => void
}

// Circular progress spinner for loading state
function CircularProgress() {
  return (
    <div className="relative w-12 h-12">
      <svg className="w-12 h-12" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="none"
          stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
      </svg>
      <svg className="absolute inset-0 w-12 h-12 animate-spin"
        viewBox="0 0 48 48" style={{ animationDuration: '1s' }}>
        <circle cx="24" cy="24" r="20" fill="none" stroke="white"
          strokeWidth="4" strokeLinecap="round" strokeDasharray="80 126" />
      </svg>
    </div>
  )
}

// Skeleton loader for media
function MediaSkeleton() {
  return (
    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
      <CircularProgress />
    </div>
  )
}

// Retry overlay for failed images
interface RetryOverlayProps {
  onRetry: () => void
  retryCount?: number
  isOffline?: boolean
}

function RetryOverlay({ onRetry, retryCount = 0, isOffline = false }: RetryOverlayProps) {
  // Determine message based on state
  let message = 'Tap to retry'
  if (isOffline) {
    message = "You're offline. Check your connection."
  } else if (retryCount >= 3) {
    message = 'Still having trouble. Check your connection.'
  }

  return (
    <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-20">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRetry()
        }}
        className="bg-white/20 hover:bg-white/30 rounded-full p-4 transition mb-2"
      >
        {isOffline ? (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
      </button>
      <span className="text-sm text-white/80">{message}</span>
    </div>
  )
}

export default function PostMedia({ post, refreshKey = 0, onImageClick, onUnlock, onMediaLoaded }: PostMediaProps) {
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
        refreshKey={refreshKey}
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
        refreshKey={refreshKey}
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
        refreshKey={refreshKey}
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
  refreshKey?: number
  onImageClick: () => void
  onUnlock: () => void
  onLoaded?: () => void
}

// Loading timeout in milliseconds
const LOAD_TIMEOUT = 10000       // 10s for images
const VIDEO_LOAD_TIMEOUT = 20000 // 20s for videos (larger files)
const RETRY_THROTTLE = 2000      // 2s between manual retries

function SingleImage({ url, localUrl, caption, locked, hasWallet, refreshKey = 0, onImageClick, onUnlock, onLoaded }: SingleImageProps) {
  const [isLoading, setIsLoading] = useState(!localUrl)
  const [hasError, setHasError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const [isOffline, setIsOffline] = useState(false)
  const hasCalledLoaded = useRef(false)
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRetryTime = useRef(0)

  // Clear timeout helper
  const clearLoadingTimer = () => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current)
      loadingTimerRef.current = null
    }
  }

  // Reset error state when refreshKey changes (triggered by menu Refresh)
  useEffect(() => {
    if (refreshKey > 0) {
      clearLoadingTimer()
      setHasError(false)
      setIsLoading(true)
      setRetryKey(prev => prev + 1)
      setRetryCount(0)
      setIsOffline(false)
    }
  }, [refreshKey])

  // Start timeout when loading begins
  useEffect(() => {
    if (isLoading && !localUrl) {
      clearLoadingTimer()

      // Timeout to show error
      loadingTimerRef.current = setTimeout(() => {
        setIsLoading(false)
        setHasError(true)
      }, LOAD_TIMEOUT)
    }
    return () => {
      clearLoadingTimer()
    }
  }, [isLoading, retryKey, localUrl])

  // Build display URL with cache-busting on retry
  const baseUrl = localUrl || url
  const displayUrl = retryKey > 0 && !localUrl ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : baseUrl

  const handleImageLoad = () => {
    clearLoadingTimer()
    setIsLoading(false)
    setHasError(false)
    setRetryCount(0)
    setIsOffline(false)
    // Only call onLoaded when remote image loads (not local blob)
    // This signals that CDN content is ready and local blob can be cleaned up
    if (!localUrl && !hasCalledLoaded.current && onLoaded) {
      hasCalledLoaded.current = true
      onLoaded()
    }
  }

  const handleImageError = () => {
    clearLoadingTimer()
    setIsLoading(false)
    setHasError(true)
  }

  const handleRetry = () => {
    // Throttle: ignore clicks within 2s of last retry
    const now = Date.now()
    if (now - lastRetryTime.current < RETRY_THROTTLE) {
      return
    }
    lastRetryTime.current = now

    // Check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true)
      return
    }
    setIsOffline(false)

    clearLoadingTimer()
    setHasError(false)
    setIsLoading(true)
    setRetryCount((prev) => prev + 1)
    setRetryKey((prev) => prev + 1)
  }

  return (
    <div className="relative w-full aspect-[4/5] bg-gray-900 flex items-center justify-center overflow-hidden">
      {isLoading && !localUrl && <MediaSkeleton />}

      {/* Error retry overlay */}
      {hasError && !locked && <RetryOverlay onRetry={handleRetry} retryCount={retryCount} isOffline={isOffline} />}

      {/* Background blur layer */}
      {!isLoading && !hasError && (
        <img
          src={displayUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-50 scale-110"
        />
      )}

      <button
        type="button"
        onClick={() => {
          if (!locked && !hasError) {
            window.history.pushState(null, '', '#view')
            onImageClick()
          }
        }}
        className={`relative z-10 w-full h-full flex items-center justify-center ${isLoading && !localUrl ? 'hidden' : ''} ${hasError ? 'hidden' : ''}`}
      >
        <img
          key={retryKey}
          src={displayUrl}
          alt={caption || 'Post image'}
          loading="lazy"
          decoding="async"
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full object-contain ${locked ? 'blur-xl' : ''}`}
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
  refreshKey?: number
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
  refreshKey = 0,
  onImageClick,
  onUnlock,
  onLoaded,
}: AlbumCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(new Set(localUrls ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : []))
  const [errorIndices, setErrorIndices] = useState<Set<number>>(new Set())
  const [retryKeys, setRetryKeys] = useState<Map<number, number>>(new Map())
  const [retryCounts, setRetryCounts] = useState<Map<number, number>>(new Map())
  const [isOffline, setIsOffline] = useState(false)
  const loadingTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const lastRetryTimes = useRef<Map<number, number>>(new Map())

  // Clear timeout helper for specific index
  const clearLoadingTimer = (index: number) => {
    const timer = loadingTimersRef.current.get(index)
    if (timer) {
      clearTimeout(timer)
      loadingTimersRef.current.delete(index)
    }
  }

  // Clear all timers
  const clearAllTimers = () => {
    loadingTimersRef.current.forEach(timer => clearTimeout(timer))
    loadingTimersRef.current.clear()
  }

  // Reset error states when refreshKey changes (triggered by menu Refresh)
  useEffect(() => {
    if (refreshKey > 0) {
      clearAllTimers()
      setErrorIndices(new Set())
      setLoadedIndices(new Set())
      setRetryCounts(new Map())
      setIsOffline(false)
      setRetryKeys(prev => {
        const updated = new Map(prev)
        mediaKeys.forEach((_, idx) => {
          updated.set(idx, (prev.get(idx) || 0) + 1)
        })
        return updated
      })
    }
  }, [refreshKey, mediaKeys])

  // Start timeout for current image when loading
  useEffect(() => {
    if (localUrls) return // Skip timeout if using local URLs

    const isCurrentLoading = !loadedIndices.has(currentIndex) && !errorIndices.has(currentIndex)

    if (isCurrentLoading) {
      clearLoadingTimer(currentIndex)

      // Timeout to show error
      const timer = setTimeout(() => {
        setLoadedIndices(prev => new Set([...prev, currentIndex]))
        setErrorIndices(prev => new Set([...prev, currentIndex]))
      }, LOAD_TIMEOUT)
      loadingTimersRef.current.set(currentIndex, timer)
    }

    return () => {
      clearLoadingTimer(currentIndex)
    }
  }, [currentIndex, loadedIndices, errorIndices, localUrls, retryKeys])
  // Cache transformed URLs to avoid re-computing
  const [transformedUrls, setTransformedUrls] = useState<Map<number, string>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const hasCalledLoaded = useRef(false)
  const allPreloaded = useRef(false)

  // Lazily transform URLs for current and ±2 adjacent slides for smoother swiping
  useEffect(() => {
    const indicesToLoad = [currentIndex]

    // Preload ±2 slides for smoother swiping experience
    for (let offset = 1; offset <= 2; offset++) {
      if (currentIndex + offset < mediaKeys.length) {
        indicesToLoad.push(currentIndex + offset)
      }
      if (currentIndex - offset >= 0) {
        indicesToLoad.push(currentIndex - offset)
      }
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

  // Preload ALL remaining slides after 3 seconds for seamless swiping through entire album
  useEffect(() => {
    // Skip if already preloaded, using local URLs, or album is small (5 or fewer)
    if (allPreloaded.current || localUrls || mediaKeys.length <= 5) return

    const timer = setTimeout(() => {
      allPreloaded.current = true

      // Transform and cache all URLs
      setTransformedUrls(prev => {
        const updated = new Map(prev)
        mediaKeys.forEach((media, idx) => {
          if (!updated.has(idx)) {
            updated.set(idx, getS3PublicUrl(media.key))
          }
        })
        return updated
      })

      // Preload all images in browser cache
      mediaKeys.forEach((media) => {
        const img = new Image()
        img.src = getS3PublicUrl(media.key)
      })
    }, 3000)

    return () => clearTimeout(timer)
  }, [mediaKeys, localUrls])

  // Get display URL for current index (prefer local if available)
  const getDisplayUrl = (index: number) => {
    if (localUrls && localUrls[index]) {
      return localUrls[index]
    }
    // Return cached transformed URL or transform on demand
    const baseUrl = transformedUrls.get(index) || getS3PublicUrl(mediaKeys[index].key)
    const retryKey = retryKeys.get(index) || 0
    // Add cache-busting on retry
    return retryKey > 0 ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : baseUrl
  }

  const handleImageLoad = (index: number) => {
    clearLoadingTimer(index)
    setLoadedIndices(prev => new Set([...prev, index]))
    setErrorIndices(prev => {
      const next = new Set(prev)
      next.delete(index)
      return next
    })
    // Reset retry count on success
    setRetryCounts(prev => {
      const next = new Map(prev)
      next.delete(index)
      return next
    })
    setIsOffline(false)
    // Call onLoaded when first remote image loads (signals CDN is ready)
    if (!localUrls && !hasCalledLoaded.current && onLoaded) {
      hasCalledLoaded.current = true
      onLoaded()
    }
  }

  const handleImageError = (index: number) => {
    clearLoadingTimer(index)
    setLoadedIndices(prev => new Set([...prev, index])) // Stop showing skeleton
    setErrorIndices(prev => new Set([...prev, index]))
  }

  const handleRetry = (index: number) => {
    // Throttle: ignore clicks within 2s of last retry
    const now = Date.now()
    const lastTime = lastRetryTimes.current.get(index) || 0
    if (now - lastTime < RETRY_THROTTLE) {
      return
    }
    lastRetryTimes.current.set(index, now)

    // Check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true)
      return
    }
    setIsOffline(false)

    clearLoadingTimer(index)
    setErrorIndices(prev => {
      const next = new Set(prev)
      next.delete(index)
      return next
    })
    setLoadedIndices(prev => {
      const next = new Set(prev)
      next.delete(index)
      return next
    })
    setRetryCounts(prev => new Map(prev).set(index, (prev.get(index) || 0) + 1))
    setRetryKeys(prev => new Map(prev).set(index, (prev.get(index) || 0) + 1))
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
  const hasCurrentError = errorIndices.has(currentIndex)

  return (
    <div className="relative w-full aspect-[4/5] bg-gray-900 flex items-center justify-center overflow-hidden">
      {/* Counter badge */}
      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-20">
        {currentIndex + 1}/{mediaKeys.length}
      </div>

      {/* Album badge */}
      <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-20 flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
        </svg>
        Album
      </div>

      {/* Skeleton when loading */}
      {!isCurrentLoaded && <MediaSkeleton />}

      {/* Error retry overlay */}
      {hasCurrentError && !locked && (
        <RetryOverlay
          onRetry={() => handleRetry(currentIndex)}
          retryCount={retryCounts.get(currentIndex) || 0}
          isOffline={isOffline}
        />
      )}

      {/* Image container */}
      <div
        ref={containerRef}
        className={`absolute inset-0 ${!isCurrentLoaded ? 'hidden' : ''} ${hasCurrentError ? 'hidden' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background blur layer */}
        <img
          src={locked ? getDisplayUrl(0) : getDisplayUrl(currentIndex)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-50 scale-110"
        />

        <button
          type="button"
          onClick={() => {
            if (!locked && !hasCurrentError) {
              window.history.pushState(null, '', '#view')
              onImageClick(currentIndex)
            }
          }}
          className="relative z-10 w-full h-full flex items-center justify-center"
        >
          <img
            key={retryKeys.get(currentIndex) || 0}
            src={locked ? getDisplayUrl(0) : getDisplayUrl(currentIndex)}
            alt={caption || `Album image ${currentIndex + 1}`}
            loading="lazy"
            decoding="async"
            onLoad={() => handleImageLoad(currentIndex)}
            onError={() => handleImageError(currentIndex)}
            className={`w-full h-full object-contain transition-opacity duration-200 ${
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
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition z-20"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition z-20"
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
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
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
  refreshKey?: number
  onUnlock: () => void
  onLoaded?: () => void
}

function ReelPlayer({ videoUrl, localVideoUrl, thumbnailUrl, localThumbnailUrl, locked, hasWallet, refreshKey = 0, onUnlock, onLoaded }: ReelPlayerProps) {
  const videoRef = useRef<SafeVideoPlayerRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isVideoReady, setIsVideoReady] = useState(!!localVideoUrl)
  const [videoError, setVideoError] = useState(false)
  const [showMuteHint, setShowMuteHint] = useState(true)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [thumbnailError, setThumbnailError] = useState(false)
  const [thumbnailRetryKey, setThumbnailRetryKey] = useState(0)
  const [videoRetryKey, setVideoRetryKey] = useState(0)
  const [videoRetryCount, setVideoRetryCount] = useState(0)
  const [thumbnailRetryCount, setThumbnailRetryCount] = useState(0)
  const [isOffline, setIsOffline] = useState(false)
  const hasCalledLoaded = useRef(false)
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastVideoRetryTime = useRef(0)
  const lastThumbnailRetryTime = useRef(0)

  // Clear timeout helper
  const clearLoadingTimer = () => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current)
      loadingTimerRef.current = null
    }
  }

  // Reset error states when refreshKey changes (triggered by menu Refresh)
  useEffect(() => {
    if (refreshKey > 0) {
      clearLoadingTimer()
      setThumbnailError(false)
      setVideoError(false)
      setThumbnailRetryKey(prev => prev + 1)
      setVideoRetryKey(prev => prev + 1)
      setIsVideoReady(false)
      setVideoRetryCount(0)
      setThumbnailRetryCount(0)
      setIsOffline(false)
    }
  }, [refreshKey])

  // Start timeout when video is loading
  useEffect(() => {
    if (!isVideoReady && !videoError && !localVideoUrl && !locked) {
      clearLoadingTimer()

      // Timeout to show error
      loadingTimerRef.current = setTimeout(() => {
        setVideoError(true)
      }, VIDEO_LOAD_TIMEOUT)
    }
    return () => {
      clearLoadingTimer()
    }
  }, [isVideoReady, videoError, videoRetryKey, localVideoUrl, locked])

  // Use local URLs if available, otherwise use remote
  // Add cache-busting on retry for video
  const baseVideoUrl = localVideoUrl || videoUrl
  const displayVideoUrl = videoRetryKey > 0 && !localVideoUrl
    ? `${baseVideoUrl}${baseVideoUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
    : baseVideoUrl
  const baseThumbnailUrl = localThumbnailUrl || thumbnailUrl
  // Add cache-busting on retry for thumbnail
  const displayThumbnailUrl = baseThumbnailUrl
    ? (thumbnailRetryKey > 0 && !localThumbnailUrl
        ? `${baseThumbnailUrl}${baseThumbnailUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
        : baseThumbnailUrl)
    : undefined

  const handleThumbnailError = () => {
    setThumbnailError(true)
  }

  const handleThumbnailRetry = () => {
    // Throttle: ignore clicks within 2s of last retry
    const now = Date.now()
    if (now - lastThumbnailRetryTime.current < RETRY_THROTTLE) {
      return
    }
    lastThumbnailRetryTime.current = now

    // Check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true)
      return
    }
    setIsOffline(false)

    setThumbnailError(false)
    setThumbnailRetryCount((prev) => prev + 1)
    setThumbnailRetryKey((prev) => prev + 1)
  }

  const handleVideoRetry = () => {
    // Throttle: ignore clicks within 2s of last retry
    const now = Date.now()
    if (now - lastVideoRetryTime.current < RETRY_THROTTLE) {
      return
    }
    lastVideoRetryTime.current = now

    // Check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true)
      return
    }
    setIsOffline(false)

    clearLoadingTimer()
    setVideoError(false)
    setIsVideoReady(false)
    setVideoRetryCount((prev) => prev + 1)
    setVideoRetryKey((prev) => prev + 1)
  }

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
    clearLoadingTimer()
    setIsVideoReady(true)
    setVideoError(false)
    setVideoRetryCount(0)
    setIsOffline(false)
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
    <div ref={containerRef} className="relative w-full aspect-[4/5] bg-gray-900 flex items-center justify-center overflow-hidden">
      {/* Reel badge */}
      <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-20 flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
        Reel
      </div>

      {locked ? (
        // Show blurred thumbnail when locked - don't load video
        <div className="absolute inset-0">
          {/* Error retry overlay for thumbnail */}
          {thumbnailError && (
            <RetryOverlay onRetry={handleThumbnailRetry} retryCount={thumbnailRetryCount} isOffline={isOffline} />
          )}

          {!thumbnailError && (
            <>
              {/* Background blur layer */}
              <img
                key={`bg-${thumbnailRetryKey}`}
                src={displayThumbnailUrl || ''}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-50 scale-110"
                onError={handleThumbnailError}
              />
              {/* Foreground blurred thumbnail */}
              <img
                key={`fg-${thumbnailRetryKey}`}
                src={displayThumbnailUrl || ''}
                alt="Reel thumbnail"
                className="relative z-10 w-full h-full object-contain blur-xl"
                onError={handleThumbnailError}
              />
            </>
          )}
          <PremiumOverlay hasWallet={hasWallet} onUnlock={onUnlock} />
        </div>
      ) : (
        // Show video player when unlocked
        <div className="absolute inset-0">
          {/* Background blur layer - using thumbnail */}
          {displayThumbnailUrl && (
            <img
              src={displayThumbnailUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-50 scale-110"
            />
          )}

          {/* Skeleton while video loads */}
          {!isVideoReady && !videoError && <MediaSkeleton />}

          {/* Error retry overlay for video */}
          {videoError && <RetryOverlay onRetry={handleVideoRetry} retryCount={videoRetryCount} isOffline={isOffline} />}

          <SafeVideoPlayer
            key={videoRetryKey}
            ref={videoRef}
            src={displayVideoUrl}
            poster={displayThumbnailUrl}
            muted={isMuted}
            loop
            className={`relative z-10 w-full h-full object-contain ${!isVideoReady || videoError ? 'hidden' : ''}`}
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
              className="absolute inset-0 flex items-center justify-center bg-black/20 z-20"
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
              className={`absolute bottom-3 right-3 bg-black/60 text-white p-2 rounded-full z-20 ${
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
              className="absolute bottom-12 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded z-20 animate-pulse"
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
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-30">
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
