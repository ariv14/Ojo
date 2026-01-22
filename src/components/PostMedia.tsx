'use client'

import { useState, useRef, useEffect } from 'react'
import { getS3PublicUrl } from '@/lib/s3'

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
}

interface PostMediaProps {
  post: Post
  onImageClick?: (urls: string[], index: number) => void
  onUnlock?: (post: Post) => void
}

export default function PostMedia({ post, onImageClick, onUnlock }: PostMediaProps) {
  const isPremiumLocked = post.is_premium && !post.has_access
  const hasWallet = post.users?.wallet_address

  // Legacy single image (backward compatibility)
  if (!post.media_type || post.media_type === 'image') {
    return (
      <SingleImage
        url={post.image_url || ''}
        caption={post.caption}
        locked={isPremiumLocked}
        hasWallet={!!hasWallet}
        onImageClick={() => {
          if (!isPremiumLocked && post.image_url) {
            onImageClick?.([post.image_url], 0)
          }
        }}
        onUnlock={() => onUnlock?.(post)}
      />
    )
  }

  // Album with carousel
  if (post.media_type === 'album' && post.media_urls) {
    const urls = post.media_urls.map((m) => getS3PublicUrl(m.key))
    return (
      <AlbumCarousel
        mediaUrls={urls}
        caption={post.caption}
        locked={isPremiumLocked}
        hasWallet={!!hasWallet}
        onImageClick={(index) => onImageClick?.(urls, index)}
        onUnlock={() => onUnlock?.(post)}
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
        thumbnailUrl={thumbnailUrl}
        locked={isPremiumLocked}
        hasWallet={!!hasWallet}
        onUnlock={() => onUnlock?.(post)}
      />
    )
  }

  // Fallback for unknown media types
  return null
}

// Single Image Component
interface SingleImageProps {
  url: string
  caption?: string | null
  locked: boolean
  hasWallet: boolean
  onImageClick: () => void
  onUnlock: () => void
}

function SingleImage({ url, caption, locked, hasWallet, onImageClick, onUnlock }: SingleImageProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!locked) {
            window.history.pushState(null, '', '#view')
            onImageClick()
          }
        }}
        className="w-full block"
      >
        <img
          src={url}
          alt={caption || 'Post image'}
          loading="lazy"
          decoding="async"
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
  mediaUrls: string[]
  caption?: string | null
  locked: boolean
  hasWallet: boolean
  onImageClick: (index: number) => void
  onUnlock: () => void
}

function AlbumCarousel({
  mediaUrls,
  caption,
  locked,
  hasWallet,
  onImageClick,
  onUnlock,
}: AlbumCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

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
      if (diff > 0 && currentIndex < mediaUrls.length - 1) {
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
    if (!locked && currentIndex < mediaUrls.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  return (
    <div className="relative">
      {/* Counter badge */}
      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
        {currentIndex + 1}/{mediaUrls.length}
      </div>

      {/* Album badge */}
      <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10 flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
        </svg>
        Album
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="overflow-hidden"
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
            src={locked ? mediaUrls[0] : mediaUrls[currentIndex]}
            alt={caption || `Album image ${currentIndex + 1}`}
            loading="lazy"
            decoding="async"
            className={`w-full max-h-[450px] md:max-h-[600px] object-contain bg-black transition-opacity duration-200 ${
              locked ? 'blur-xl' : ''
            }`}
          />
        </button>
      </div>

      {/* Navigation arrows (hidden when locked) */}
      {!locked && mediaUrls.length > 1 && (
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
          {currentIndex < mediaUrls.length - 1 && (
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
      {mediaUrls.length > 1 && !locked && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {mediaUrls.map((_, idx) => (
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
  thumbnailUrl?: string
  locked: boolean
  hasWallet: boolean
  onUnlock: () => void
}

function ReelPlayer({ videoUrl, thumbnailUrl, locked, hasWallet, onUnlock }: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)

  // Auto-play when 50% visible using IntersectionObserver
  useEffect(() => {
    if (locked || !videoRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            videoRef.current?.play().catch(() => {
              // Autoplay may be blocked, that's ok
            })
            setIsPlaying(true)
          } else {
            videoRef.current?.pause()
            setIsPlaying(false)
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

  const togglePlay = () => {
    if (locked) return

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  return (
    <div ref={containerRef} className="relative bg-black">
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
            src={thumbnailUrl || ''}
            alt="Reel thumbnail"
            className="w-full max-h-[450px] md:max-h-[600px] object-contain blur-xl"
          />
          <PremiumOverlay hasWallet={hasWallet} onUnlock={onUnlock} />
        </div>
      ) : (
        // Show video player when unlocked
        <div className="relative">
          <video
            ref={videoRef}
            src={videoUrl}
            poster={thumbnailUrl}
            muted={isMuted}
            loop
            playsInline
            className="w-full max-h-[450px] md:max-h-[600px] object-contain"
            onClick={togglePlay}
          />

          {/* Play/Pause overlay */}
          {!isPlaying && (
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
          <button
            type="button"
            onClick={toggleMute}
            className="absolute bottom-3 right-3 bg-black/60 text-white p-2 rounded-full z-10"
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
