const PROFILE_CACHE_KEY = 'ojo_profile_cache'
const PROFILE_CACHE_VERSION = 2
const MAX_CACHED_PROFILES = 20

interface CachedUser {
  nullifier_hash: string
  wallet_address: string | null
  first_name: string | null
  last_name: string | null
  country: string | null
  avatar_url: string | null
  created_at: string
  sex: string | null
  age: number | null
}

interface CachedPost {
  id: string
  image_url: string
  caption: string | null
  created_at: string
  is_premium: boolean
  has_access: boolean
  users: {
    wallet_address: string | null
  } | null
}

interface CachedVisitor {
  nullifier_hash: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

interface ProfileCacheEntry {
  user: CachedUser
  posts: CachedPost[]
  viewCount: number
  visitors: CachedVisitor[]
  followerCount: number
  isFollowing: boolean
  tipsEarned: number
}

interface ProfileCache {
  version: number
  timestamp: number
  viewerId: string
  profiles: Record<string, ProfileCacheEntry>
}

export function getProfileCacheEntry(viewerId: string, profileId: string): ProfileCacheEntry | null {
  if (typeof window === 'undefined') return null

  const data = localStorage.getItem(PROFILE_CACHE_KEY)
  if (!data) return null

  try {
    const cache = JSON.parse(data) as ProfileCache

    // Version check
    if (cache.version !== PROFILE_CACHE_VERSION) {
      clearProfileCache()
      return null
    }

    // Viewer check - don't use cache from different user
    if (cache.viewerId !== viewerId) {
      clearProfileCache()
      return null
    }

    return cache.profiles[profileId] || null
  } catch {
    clearProfileCache()
    return null
  }
}

export function setProfileCacheEntry(
  viewerId: string,
  profileId: string,
  entry: ProfileCacheEntry
): void {
  if (typeof window === 'undefined') return

  try {
    let cache: ProfileCache

    const data = localStorage.getItem(PROFILE_CACHE_KEY)
    if (data) {
      cache = JSON.parse(data) as ProfileCache

      // Reset cache if version or viewer changed
      if (cache.version !== PROFILE_CACHE_VERSION || cache.viewerId !== viewerId) {
        cache = {
          version: PROFILE_CACHE_VERSION,
          timestamp: Date.now(),
          viewerId,
          profiles: {},
        }
      }
    } else {
      cache = {
        version: PROFILE_CACHE_VERSION,
        timestamp: Date.now(),
        viewerId,
        profiles: {},
      }
    }

    // Update timestamp
    cache.timestamp = Date.now()

    // Add/update the profile entry
    cache.profiles[profileId] = entry

    // Limit cached profiles to prevent storage overflow
    const profileIds = Object.keys(cache.profiles)
    if (profileIds.length > MAX_CACHED_PROFILES) {
      // Remove oldest entries (keep most recent MAX_CACHED_PROFILES)
      const toRemove = profileIds.slice(0, profileIds.length - MAX_CACHED_PROFILES)
      toRemove.forEach(id => delete cache.profiles[id])
    }

    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache))
  } catch (err) {
    // localStorage might be full - silently fail
    console.error('Failed to cache profile:', err)
  }
}

export function clearProfileCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PROFILE_CACHE_KEY)
}

export { PROFILE_CACHE_VERSION }
export type { ProfileCacheEntry, CachedUser, CachedPost, CachedVisitor }
