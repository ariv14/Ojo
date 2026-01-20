'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MiniKit } from '@worldcoin/minikit-js'
import { supabase } from '@/lib/supabase'
import { getSession, UserSession } from '@/lib/session'
import { getDiscoverCache, setDiscoverCache, DISCOVER_CACHE_VERSION } from '@/lib/discoverCache'
import { hapticMedium, hapticLight } from '@/lib/haptics'
import UserAvatar from '@/components/UserAvatar'

interface User {
  nullifier_hash: string
  first_name: string
  last_name: string
  avatar_url: string | null
  country: string | null
  last_seen_at: string | null
  post_count: number
}

const USERS_PER_PAGE = 10
const SEARCH_DEBOUNCE_MS = 300

// Sort users: followed users first, then others (maintains order within groups)
const sortUsersFollowedFirst = (users: User[], followingSet: Set<string>): User[] => {
  const followed: User[] = []
  const notFollowed: User[] = []

  for (const user of users) {
    if (followingSet.has(user.nullifier_hash)) {
      followed.push(user)
    } else {
      notFollowed.push(user)
    }
  }

  return [...followed, ...notFollowed]
}

export default function DiscoverPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set())
  const [blockedSet, setBlockedSet] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null)
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const init = async () => {
      const session = getSession()
      if (!session) {
        router.push('/')
        return
      }
      setCurrentSession(session)

      // Try to load from cache first for instant display
      const cache = getDiscoverCache(session.nullifier_hash)
      if (cache && cache.users.length > 0) {
        setUsers(cache.users)
        setFollowingSet(new Set(cache.followingUsers))
        setBlockedSet(new Set(cache.blockedUsers))
        setIsLoading(false)
      }

      // Parallelize: fetch relationships AND initial users at the same time
      const [relationshipsResult, usersResult] = await Promise.all([
        supabase
          .from('relationships')
          .select('target_id, type')
          .eq('follower_id', session.nullifier_hash),
        // Initial users fetch with post counts via RPC
        supabase.rpc('get_discover_users', {
          p_user_id: session.nullifier_hash,
          p_limit: USERS_PER_PAGE,
          p_offset: 0,
          p_search: null
        }),
      ])

      const following = new Set<string>()
      const blocked = new Set<string>()
      relationshipsResult.data?.forEach(r => {
        if (r.type === 'follow') following.add(r.target_id)
        if (r.type === 'block') blocked.add(r.target_id)
      })
      setFollowingSet(following)
      setBlockedSet(blocked)

      // Filter blocked users and sort with followed first
      const filteredUsers = (usersResult.data || []).filter(
        (u: User) => !blocked.has(u.nullifier_hash)
      )
      const sortedUsers = sortUsersFollowedFirst(filteredUsers, following)
      setUsers(sortedUsers)
      setHasMore((usersResult.data?.length || 0) === USERS_PER_PAGE)

      // Cache the discover data for instant load next time
      if (sortedUsers.length > 0) {
        setDiscoverCache({
          version: DISCOVER_CACHE_VERSION,
          timestamp: Date.now(),
          userId: session.nullifier_hash,
          users: sortedUsers,
          followingUsers: Array.from(following),
          blockedUsers: Array.from(blocked),
        })
      }

      setIsLoading(false)
    }

    init()
  }, [router])

  const fetchUsers = async (
    myId: string,
    query: string,
    pageNum: number,
    append: boolean,
    blocked: Set<string>,
    following: Set<string>
  ) => {
    const offset = pageNum * USERS_PER_PAGE

    const { data, error } = await supabase.rpc('get_discover_users', {
      p_user_id: myId,
      p_limit: USERS_PER_PAGE,
      p_offset: offset,
      p_search: query.trim() || null
    })

    if (error) {
      console.error('Error fetching users:', error)
      return
    }

    // Filter out blocked users and sort with followed first
    const filteredData = (data || []).filter((u: User) => !blocked.has(u.nullifier_hash))
    const sortedData = sortUsersFollowedFirst(filteredData, following)

    if (!data || data.length < USERS_PER_PAGE) {
      setHasMore(false)
    } else {
      setHasMore(true)
    }

    if (append) {
      setUsers(prev => [...prev, ...sortedData])
    } else {
      setUsers(sortedData)
    }
  }

  // Debounced search to avoid query on every keystroke
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)

    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Debounce the actual search
    searchTimeoutRef.current = setTimeout(async () => {
      setPage(0)
      setHasMore(true)
      if (currentSession) {
        await fetchUsers(currentSession.nullifier_hash, query, 0, false, blockedSet, followingSet)
      }
    }, SEARCH_DEBOUNCE_MS)
  }, [currentSession, blockedSet, followingSet])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleLoadMore = async () => {
    if (!currentSession || isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)
    await fetchUsers(currentSession.nullifier_hash, searchQuery, nextPage, true, blockedSet, followingSet)
    setIsLoadingMore(false)
  }

  const handleFollowToggle = async (userId: string) => {
    if (!currentSession) return
    setProcessingUserId(userId)

    const isCurrentlyFollowing = followingSet.has(userId)

    // Haptic feedback for follow/unfollow
    hapticMedium()

    // Optimistic update
    setFollowingSet(prev => {
      const newSet = new Set(prev)
      if (isCurrentlyFollowing) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })

    if (isCurrentlyFollowing) {
      // Unfollow
      const { error } = await supabase
        .from('relationships')
        .delete()
        .eq('follower_id', currentSession.nullifier_hash)
        .eq('target_id', userId)
        .eq('type', 'follow')

      if (error) {
        console.error('Error unfollowing:', error)
        // Revert optimistic update
        setFollowingSet(prev => {
          const newSet = new Set(prev)
          newSet.add(userId)
          return newSet
        })
      }
    } else {
      // Follow
      const { error } = await supabase
        .from('relationships')
        .insert({
          follower_id: currentSession.nullifier_hash,
          target_id: userId,
          type: 'follow',
        })

      if (error) {
        console.error('Error following:', error)
        // Revert optimistic update
        setFollowingSet(prev => {
          const newSet = new Set(prev)
          newSet.delete(userId)
          return newSet
        })
      }
    }

    setProcessingUserId(null)
  }

  const handleInviteFriends = async () => {
    if (!MiniKit.isInstalled()) {
      alert('Please open this app in World App')
      return
    }

    hapticLight()

    try {
      const result = await MiniKit.commandsAsync.shareContacts({
        isMultiSelectEnabled: true,
        inviteMessage: 'Join me on Ojo - the social network for verified humans!',
      })

      if (result.finalPayload?.status === 'success') {
        const contacts = result.finalPayload.contacts
        if (contacts.length === 0) {
          alert('No contacts selected')
        }
        // Contacts were shared successfully
      }
    } catch (err) {
      console.error('Share contacts error:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 z-10">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold flex-1">Discover</h1>
        <button
          onClick={handleInviteFriends}
          className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-sm font-medium rounded-full hover:bg-gray-800 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Invite
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white px-4 py-3 border-b">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
        />
      </div>

      {/* User List */}
      <div className="max-w-md mx-auto bg-white">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? 'No users found' : 'No users to discover'}
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.nullifier_hash}
              className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100"
            >
              <button
                onClick={() => router.push(`/profile/${user.nullifier_hash}`)}
                className="flex-1 flex items-center gap-3"
              >
                <UserAvatar
                  avatarUrl={user.avatar_url}
                  firstName={user.first_name}
                  lastSeenAt={user.last_seen_at}
                  size="md"
                />
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">
                    {user.first_name} {user.last_name}
                  </p>
                  {user.country && (
                    <p className="text-xs text-gray-500">{user.country}</p>
                  )}
                </div>
              </button>
              {/* Post count button */}
              {user.post_count > 0 && (
                <button
                  onClick={() => router.push(`/profile/${user.nullifier_hash}`)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{user.post_count}</span>
                </button>
              )}
              <button
                onClick={() => handleFollowToggle(user.nullifier_hash)}
                disabled={processingUserId === user.nullifier_hash}
                className={`px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-50 ${
                  followingSet.has(user.nullifier_hash)
                    ? 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {processingUserId === user.nullifier_hash
                  ? '...'
                  : followingSet.has(user.nullifier_hash)
                  ? 'Following'
                  : 'Follow'}
              </button>
            </div>
          ))
        )}

        {/* Load More Button */}
        {hasMore && users.length > 0 && (
          <div className="p-4">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full py-3 text-blue-500 font-medium border border-blue-500 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition"
            >
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
