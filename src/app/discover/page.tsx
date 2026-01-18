'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSession, UserSession } from '@/lib/session'
import UserAvatar from '@/components/UserAvatar'

interface User {
  nullifier_hash: string
  first_name: string
  last_name: string
  avatar_url: string | null
  country: string | null
  last_seen_at: string | null
}

const USERS_PER_PAGE = 10
const SEARCH_DEBOUNCE_MS = 300

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

      // Parallelize: fetch relationships AND initial users at the same time
      const [relationshipsResult, usersResult] = await Promise.all([
        supabase
          .from('relationships')
          .select('target_id, type')
          .eq('follower_id', session.nullifier_hash),
        // Initial users fetch (will filter blocked client-side on first load)
        supabase
          .from('users')
          .select('nullifier_hash, first_name, last_name, avatar_url, country, last_seen_at')
          .neq('nullifier_hash', session.nullifier_hash)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .range(0, USERS_PER_PAGE - 1),
      ])

      const following = new Set<string>()
      const blocked = new Set<string>()
      relationshipsResult.data?.forEach(r => {
        if (r.type === 'follow') following.add(r.target_id)
        if (r.type === 'block') blocked.add(r.target_id)
      })
      setFollowingSet(following)
      setBlockedSet(blocked)

      // Filter blocked users from initial fetch
      const filteredUsers = (usersResult.data || []).filter(
        u => !blocked.has(u.nullifier_hash)
      )
      setUsers(filteredUsers)
      setHasMore((usersResult.data?.length || 0) === USERS_PER_PAGE)
      setIsLoading(false)
    }

    init()
  }, [router])

  const fetchUsers = async (
    myId: string,
    query: string,
    pageNum: number,
    append: boolean,
    blocked: Set<string>
  ) => {
    const from = pageNum * USERS_PER_PAGE
    const to = from + USERS_PER_PAGE - 1

    let queryBuilder = supabase
      .from('users')
      .select('nullifier_hash, first_name, last_name, avatar_url, country, last_seen_at')
      .neq('nullifier_hash', myId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (query.trim()) {
      queryBuilder = queryBuilder.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    }

    const { data, error } = await queryBuilder

    if (error) {
      console.error('Error fetching users:', error)
      return
    }

    // Filter out blocked users
    const filteredData = (data || []).filter(u => !blocked.has(u.nullifier_hash))

    if (!data || data.length < USERS_PER_PAGE) {
      setHasMore(false)
    } else {
      setHasMore(true)
    }

    if (append) {
      setUsers(prev => [...prev, ...filteredData])
    } else {
      setUsers(filteredData)
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
        await fetchUsers(currentSession.nullifier_hash, query, 0, false, blockedSet)
      }
    }, SEARCH_DEBOUNCE_MS)
  }, [currentSession, blockedSet])

  // Cleanup timeout on unmount
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
    await fetchUsers(currentSession.nullifier_hash, searchQuery, nextPage, true, blockedSet)
    setIsLoadingMore(false)
  }

  const handleFollowToggle = async (userId: string) => {
    if (!currentSession) return
    setProcessingUserId(userId)

    const isCurrentlyFollowing = followingSet.has(userId)

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
        <h1 className="text-xl font-bold">Discover</h1>
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
