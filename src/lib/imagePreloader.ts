import { getS3PublicUrl, resolveImageUrl } from '@/lib/s3'

interface MediaUrl {
  key: string
  type: string
}

interface Post {
  id: string
  image_url?: string
  media_type?: 'image' | 'album' | 'reel'
  media_urls?: MediaUrl[]
  thumbnail_url?: string
  localBlobs?: {
    localImageUrl?: string
    localMediaUrls?: string[]
    localVideoUrl?: string
    localThumbnailUrl?: string
  }
}

const preloadedUrls = new Set<string>()

/**
 * Preload a single image URL
 */
export function preloadImage(url: string): Promise<void> {
  if (!url || preloadedUrls.has(url)) return Promise.resolve()

  preloadedUrls.add(url)

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve() // Don't block on errors
    img.src = url
  })
}

/**
 * Preload images for upcoming posts based on current visible index
 * @param posts - Array of posts
 * @param currentVisibleIndex - Index of currently visible post
 * @param count - Number of posts ahead to preload (default 3)
 */
export function preloadPostImages(
  posts: Post[],
  currentVisibleIndex: number,
  count: number = 3
): void {
  const startIndex = currentVisibleIndex + 1

  for (let i = startIndex; i < Math.min(startIndex + count, posts.length); i++) {
    const post = posts[i]
    if (!post) continue

    // Skip if already preloaded via localBlobs
    if (post.localBlobs?.localImageUrl) continue

    let urlToPreload: string | undefined

    if (post.image_url) {
      // Single image - could be legacy Supabase URL or R2 key
      urlToPreload = resolveImageUrl(post.image_url)
    } else if (post.media_urls?.length && post.media_type === 'album') {
      // Album - preload first image
      urlToPreload = getS3PublicUrl(post.media_urls[0].key)
    } else if (post.thumbnail_url && post.media_type === 'reel') {
      // Reel - preload thumbnail
      urlToPreload = getS3PublicUrl(post.thumbnail_url)
    }

    if (urlToPreload) {
      preloadImage(urlToPreload)
    }
  }
}

/**
 * Clear the preload cache (useful for memory management)
 */
export function clearPreloadCache(): void {
  preloadedUrls.clear()
}
