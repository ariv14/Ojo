const DISCOVER_CACHE_KEY = 'ojo_discover_cache'
const DISCOVER_CACHE_VERSION = 4  // Bumped for username support

interface CachedUser {
  nullifier_hash: string
  username: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  country: string | null
  last_seen_at: string | null
  post_count: number
  wallet_address: string | null
}

interface DiscoverCache {
  version: number
  timestamp: number
  userId: string
  users: CachedUser[]
  followingUsers: string[]
  blockedUsers: string[]
}

export function getDiscoverCache(userId: string): DiscoverCache | null {
  if (typeof window === 'undefined') return null

  const data = localStorage.getItem(DISCOVER_CACHE_KEY)
  if (!data) return null

  try {
    const cache = JSON.parse(data) as DiscoverCache

    // Version check
    if (cache.version !== DISCOVER_CACHE_VERSION) {
      clearDiscoverCache()
      return null
    }

    // User check - don't use cache from different user
    if (cache.userId !== userId) {
      clearDiscoverCache()
      return null
    }

    return cache
  } catch {
    clearDiscoverCache()
    return null
  }
}

export function setDiscoverCache(cache: DiscoverCache): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(DISCOVER_CACHE_KEY, JSON.stringify(cache))
  } catch (err) {
    // localStorage might be full - silently fail
    console.error('Failed to cache discover:', err)
  }
}

export function clearDiscoverCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DISCOVER_CACHE_KEY)
}

export { DISCOVER_CACHE_VERSION }
export type { DiscoverCache, CachedUser }
