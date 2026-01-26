const SESSION_KEY = 'ojo_user'

export interface UserSession {
  nullifier_hash: string
  username?: string           // Primary display name from World App
  avatar_url?: string         // Profile picture URL from World App
  wallet_address?: string     // Wallet address from MiniKit
  // Deprecated - kept for backwards compatibility during migration
  first_name?: string
  last_name?: string
  country?: string
}

export function getSession(): UserSession | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem(SESSION_KEY)
  if (!data) return null
  try {
    return JSON.parse(data) as UserSession
  } catch {
    return null
  }
}

export function setSession(user: UserSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem('ojo_feed_cache')
  localStorage.removeItem('ojo_profile_cache')
  localStorage.removeItem('ojo_discover_cache')
}
