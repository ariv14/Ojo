const FEED_CACHE_KEY = 'ojo_feed_cache'
const FEED_CACHE_VERSION = 3 // Bumped for reshares & comments support
const CACHE_STALE_MS = 5 * 60 * 1000 // 5 minutes - show cached but refresh in background
const CACHE_EXPIRED_MS = 30 * 60 * 1000 // 30 minutes - don't show cached data at all

interface MediaUrl {
  key: string
  type: string
}

interface CachedPost {
  id: string
  user_id: string
  image_url?: string
  caption: string | null
  created_at: string
  users: {
    first_name: string
    last_name: string
    avatar_url: string | null
    wallet_address: string | null
    status: string | null
    last_seen_at: string | null
  }
  like_count: number
  dislike_count: number
  user_vote: 'like' | 'dislike' | null
  total_tips: number
  is_premium: boolean
  has_access: boolean
  boosted_until: string | null
  media_type?: 'image' | 'album' | 'reel'
  media_urls?: MediaUrl[]
  thumbnail_url?: string
  // Reshare fields
  original_post_id?: string | null
  reshare_comment?: string | null
  reshare_count: number
  user_has_reshared: boolean
  original?: {
    id: string
    user_id: string
    users: {
      first_name: string
      last_name: string
      avatar_url: string | null
      wallet_address: string | null
    }
    image_url?: string
    caption: string | null
    is_premium: boolean
    media_type?: 'image' | 'album' | 'reel'
    media_urls?: MediaUrl[]
    thumbnail_url?: string
  }
  // Comment fields
  comment_count: number
}

interface FeedCache {
  version: number
  timestamp: number
  userId: string
  posts: CachedPost[]
  hiddenUsers: string[]
  followedUsers: string[]
}

export function getFeedCache(userId: string): FeedCache | null {
  if (typeof window === 'undefined') return null

  const data = localStorage.getItem(FEED_CACHE_KEY)
  if (!data) return null

  try {
    const cache = JSON.parse(data) as FeedCache

    // Version check
    if (cache.version !== FEED_CACHE_VERSION) {
      clearFeedCache()
      return null
    }

    // User check - don't use stale cache from different user
    if (cache.userId !== userId) {
      clearFeedCache()
      return null
    }

    return cache
  } catch {
    clearFeedCache()
    return null
  }
}

export function setFeedCache(cache: FeedCache): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(cache))
  } catch (err) {
    // localStorage might be full - silently fail
    console.error('Failed to cache feed:', err)
  }
}

export function clearFeedCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(FEED_CACHE_KEY)
}

/**
 * Check if cache is stale (older than 5 minutes)
 * Stale cache can still be shown, but should trigger background refresh
 */
export function isCacheStale(cache: FeedCache): boolean {
  return Date.now() - cache.timestamp > CACHE_STALE_MS
}

/**
 * Check if cache is expired (older than 30 minutes)
 * Expired cache should not be shown at all
 */
export function isCacheExpired(cache: FeedCache): boolean {
  return Date.now() - cache.timestamp > CACHE_EXPIRED_MS
}

export { FEED_CACHE_VERSION }
export type { FeedCache, CachedPost, MediaUrl }
