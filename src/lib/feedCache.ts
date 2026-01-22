const FEED_CACHE_KEY = 'ojo_feed_cache'
const FEED_CACHE_VERSION = 2 // Bumped for albums & reels support

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

export { FEED_CACHE_VERSION }
export type { FeedCache, CachedPost, MediaUrl }
