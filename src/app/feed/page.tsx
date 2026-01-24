'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSession, clearSession, UserSession } from '@/lib/session'
import { getFeedCache, setFeedCache, isCacheStale, isCacheExpired, FEED_CACHE_VERSION } from '@/lib/feedCache'
import { preloadPostImages, clearPreloadCache } from '@/lib/imagePreloader'
import { ensureWalletConnected } from '@/lib/wallet'
import UploadPost from '@/components/UploadPost'
import ChatButton from '@/components/ChatButton'
import TipButton from '@/components/TipButton'
import UserAvatar from '@/components/UserAvatar'
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from '@worldcoin/minikit-js'
import { hapticLight, hapticMedium, hapticSuccess, hapticSelection } from '@/lib/haptics'
import { sendNotification } from '@/lib/notify'
import ReportModal from '@/components/ReportModal'
import ImageViewer from '@/components/ImageViewer'
import ConfirmationModal from '@/components/ConfirmationModal'
import PostMedia from '@/components/PostMedia'

interface MediaUrl {
  key: string
  type: string
}

interface Post {
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
  localBlobs?: {
    localImageUrl?: string
    localMediaUrls?: string[]
    localVideoUrl?: string
    localThumbnailUrl?: string
  }
}

function FeedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [hiddenUsers, setHiddenUsers] = useState<Set<string>>(new Set())
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set())
  const [currentSession, setCurrentSession] = useState<UserSession | null>(() => {
    if (typeof window === 'undefined') return null
    return getSession()
  })
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [openOtherMenuId, setOpenOtherMenuId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [reportingPostId, setReportingPostId] = useState<string | null>(null)
  const [deletePostId, setDeletePostId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewingImage, setViewingImage] = useState<{ urls: string[]; currentIndex: number; caption?: string } | null>(null)
  const [unlockingPost, setUnlockingPost] = useState<Post | null>(null)
  const [unlockStep, setUnlockStep] = useState(0) // 0 = not started, 1 = platform fee, 2 = creator payment
  const [unlockError, setUnlockError] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [newPostCount, setNewPostCount] = useState(0)
  const touchStartY = useRef(0)
  const lastFetchTime = useRef<string | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const POSTS_PER_PAGE = 5
  const MAX_POSTS = 100 // Limit posts in memory for performance
  const PULL_THRESHOLD = 80
  const SCROLL_TOLERANCE = 10 // pixels - allows pull-to-refresh when near top

  useEffect(() => {
    const initFeed = async () => {
      const session = getSession()
      if (!session) {
        router.push('/')
        return
      }

      // Try to load from cache first for instant display
      const cache = getFeedCache(session.nullifier_hash)
      const hasValidCache = cache && cache.posts.length > 0 && !isCacheExpired(cache)

      if (hasValidCache) {
        setPosts(cache.posts)
        setHiddenUsers(new Set(cache.hiddenUsers))
        setFollowedUsers(new Set(cache.followedUsers))
        setIsLoading(false)
      }

      // Verify user exists in database (handles deleted profiles)
      const { data: user, error } = await supabase
        .from('users')
        .select('nullifier_hash, first_name')
        .eq('nullifier_hash', session.nullifier_hash)
        .single()

      if (error || !user || !user.first_name) {
        // User doesn't exist or hasn't completed onboarding - clear session
        clearSession()
        router.push('/')
        return
      }

      setCurrentSession(session)

      // Stale-while-revalidate: if cache is stale, fetch silently in background
      // If no cache or expired, fetch with loading state (already showing)
      if (hasValidCache && isCacheStale(cache)) {
        // Silent background refresh - don't show loading state
        fetchPosts(session)
      } else if (!hasValidCache) {
        // No cache or expired - fetch with loading state
        fetchPosts(session)
      }

      fetchUnreadCount(session.nullifier_hash)
    }

    initFeed()

    // Subscribe to new incoming chats
    const session = getSession()
    if (!session) return

    const channel = supabase
      .channel('new-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Check if message is for user (not from user)
          if (payload.new && (payload.new as { sender_id: string }).sender_id !== session.nullifier_hash) {
            setUnreadCount((prev) => prev + 1)
          }
        }
      )
      .subscribe()

    // Subscribe to new posts
    const postsChannel = supabase
      .channel('new-posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          // Don't count user's own posts (they're already added optimistically)
          if (payload.new && (payload.new as { user_id: string }).user_id !== session.nullifier_hash) {
            setNewPostCount((prev) => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(postsChannel)
    }
  }, [router])

  // Cleanup blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      posts.forEach(post => {
        if (post.localBlobs) {
          if (post.localBlobs.localImageUrl) URL.revokeObjectURL(post.localBlobs.localImageUrl)
          post.localBlobs.localMediaUrls?.forEach(url => URL.revokeObjectURL(url))
          if (post.localBlobs.localVideoUrl) URL.revokeObjectURL(post.localBlobs.localVideoUrl)
          if (post.localBlobs.localThumbnailUrl) URL.revokeObjectURL(post.localBlobs.localThumbnailUrl)
        }
      })
    }
  }, [])

  // Heartbeat to update presence
  useEffect(() => {
    const session = getSession()
    if (!session) return

    const sendHeartbeat = () => {
      fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: session.nullifier_hash }),
      })
    }

    sendHeartbeat()

    // Send heartbeat every 2 minutes
    const interval = setInterval(sendHeartbeat, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null)
      setOpenOtherMenuId(null)
    }
    if (openMenuId || openOtherMenuId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuId, openOtherMenuId])

  // Scroll to post if scrollTo param is present
  useEffect(() => {
    const scrollToId = searchParams.get('scrollTo')
    if (scrollToId && posts.length > 0) {
      const element = document.getElementById(`post-${scrollToId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [searchParams, posts])

  // Scroll-based image preloading for upcoming posts
  useEffect(() => {
    if (posts.length === 0) return

    const handleScroll = () => {
      // Estimate visible post index based on scroll position
      const scrollTop = window.scrollY
      const postHeight = 500 // Approximate height per post
      const visibleIndex = Math.floor(scrollTop / postHeight)

      // Preload next 3 posts
      preloadPostImages(posts, visibleIndex, 3)
    }

    // Debounce scroll handler for performance
    let timeoutId: ReturnType<typeof setTimeout>
    const debouncedHandler = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleScroll, 100)
    }

    window.addEventListener('scroll', debouncedHandler, { passive: true })

    // Preload first 5 posts on initial load
    preloadPostImages(posts, -1, 5)

    return () => {
      window.removeEventListener('scroll', debouncedHandler)
      clearTimeout(timeoutId)
    }
  }, [posts])

  // Handle Android back button for image viewer
  useEffect(() => {
    const handlePopState = () => {
      if (viewingImage) {
        setViewingImage(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [viewingImage])

  const fetchUnreadCount = async (nullifierHash: string) => {
    // Use RPC function for efficient single-query unread count
    // This replaces the N+1 query pattern (one query per connection)
    const { data: totalUnread, error } = await supabase
      .rpc('get_total_unread_count', { p_user_id: nullifierHash })

    if (error) {
      console.error('Error fetching unread count:', error)
      setUnreadCount(0)
      return
    }

    setUnreadCount(totalUnread || 0)
  }

  const fetchPosts = async (session: UserSession, pageNum: number = 0, append: boolean = false) => {
    // For initial load, fetch blocked/followed users
    let blockedUserIds: Set<string>
    let followedUserIds: Set<string>

    if (!append) {
      // Fetch blocked users
      const { data: blockedData } = await supabase
        .from('relationships')
        .select('target_id')
        .eq('follower_id', session.nullifier_hash)
        .eq('type', 'block')

      blockedUserIds = new Set(blockedData?.map(b => b.target_id) || [])
      setHiddenUsers(blockedUserIds)

      // Fetch followed users
      const { data: followedData } = await supabase
        .from('relationships')
        .select('target_id')
        .eq('follower_id', session.nullifier_hash)
        .eq('type', 'follow')

      followedUserIds = new Set(followedData?.map(f => f.target_id) || [])
      setFollowedUsers(followedUserIds)
    } else {
      // Use cached values for append
      blockedUserIds = hiddenUsers
      followedUserIds = followedUsers
    }

    // Calculate pagination range
    const from = pageNum * POSTS_PER_PAGE
    const to = from + POSTS_PER_PAGE - 1

    // Fetch posts with user data
    const { data: postsData, error } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        image_url,
        caption,
        created_at,
        is_premium,
        boosted_until,
        media_type,
        media_urls,
        thumbnail_url,
        users (
          first_name,
          last_name,
          avatar_url,
          wallet_address,
          status,
          last_seen_at
        )
      `)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching posts:', error)
      setIsLoading(false)
      setIsLoadingMore(false)
      return
    }

    // Check if we got fewer posts than requested (no more pages)
    if (!postsData || postsData.length < POSTS_PER_PAGE) {
      setHasMore(false)
    }

    if (!postsData || postsData.length === 0) {
      if (!append) {
        setPosts([])
      }
      setIsLoading(false)
      setIsLoadingMore(false)
      return
    }

    // Filter out blocked users and disabled users
    const filteredPostsData = postsData.filter(p =>
      !blockedUserIds.has(p.user_id) &&
      (p.users as unknown as { status: string | null })?.status !== 'disabled'
    )

    if (filteredPostsData.length === 0) {
      if (!append) {
        setPosts([])
      }
      setIsLoading(false)
      setIsLoadingMore(false)
      return
    }

    const postIds = filteredPostsData.map(p => p.id)

    // Fetch all related data in parallel for better performance
    let allVotes: { post_id: string; vote_type: string }[] | null = null
    let userVotes: { post_id: string; vote_type: string }[] | null = null
    let tipTotals: { post_id: string; amount: number }[] | null = null
    let accessData: { post_id: string }[] | null = null

    try {
      const results = await Promise.all([
        // All votes for these posts
        supabase
          .from('post_votes')
          .select('post_id, vote_type')
          .in('post_id', postIds),
        // Current user's votes
        supabase
          .from('post_votes')
          .select('post_id, vote_type')
          .eq('user_id', session.nullifier_hash)
          .in('post_id', postIds),
        // Tip totals for posts
        supabase
          .from('tips')
          .select('post_id, amount')
          .in('post_id', postIds),
        // User's post access (for premium posts)
        supabase
          .from('post_access')
          .select('post_id')
          .eq('user_id', session.nullifier_hash)
      ])

      allVotes = results[0].data
      userVotes = results[1].data
      tipTotals = results[2].data as { post_id: string; amount: number }[] | null
      accessData = results[3].data
    } catch (error) {
      console.error('Error fetching post metadata:', error)
      // Continue with empty metadata - posts will still display
    }

    // Process user votes into a map
    const userVotesMap: Record<string, 'like' | 'dislike'> = {}
    userVotes?.forEach(v => {
      userVotesMap[v.post_id] = v.vote_type as 'like' | 'dislike'
    })

    // Calculate vote counts per post
    const voteCounts: Record<string, { likes: number; dislikes: number }> = {}
    postIds.forEach(id => {
      voteCounts[id] = { likes: 0, dislikes: 0 }
    })
    allVotes?.forEach(v => {
      if (v.vote_type === 'like') {
        voteCounts[v.post_id].likes++
      } else {
        voteCounts[v.post_id].dislikes++
      }
    })

    // Aggregate tips per post
    const tipsByPost: Record<string, number> = {}
    tipTotals?.forEach(t => {
      tipsByPost[t.post_id] = (tipsByPost[t.post_id] || 0) + Number(t.amount)
    })

    const accessedPostIds = new Set(accessData?.map(a => a.post_id) || [])

    // Combine posts with vote data, tips, and access
    const postsWithVotes: Post[] = filteredPostsData.map(p => ({
      id: p.id,
      user_id: p.user_id,
      image_url: p.image_url,
      caption: p.caption,
      created_at: p.created_at,
      users: p.users as unknown as Post['users'],
      like_count: voteCounts[p.id]?.likes || 0,
      dislike_count: voteCounts[p.id]?.dislikes || 0,
      user_vote: userVotesMap[p.id] || null,
      total_tips: tipsByPost[p.id] || 0,
      is_premium: (p as unknown as { is_premium: boolean }).is_premium || false,
      has_access: accessedPostIds.has(p.id) || p.user_id === session.nullifier_hash,
      boosted_until: (p as unknown as { boosted_until: string | null }).boosted_until || null,
      media_type: (p as unknown as { media_type?: 'image' | 'album' | 'reel' }).media_type,
      media_urls: (p as unknown as { media_urls?: MediaUrl[] }).media_urls,
      thumbnail_url: (p as unknown as { thumbnail_url?: string }).thumbnail_url,
    }))

    // Sort: boosted posts first, then pure chronological
    if (!append) {
      const now = new Date()
      postsWithVotes.sort((a, b) => {
        // Boosted posts first (if still active)
        const aBoosted = a.boosted_until && new Date(a.boosted_until) > now ? 1 : 0
        const bBoosted = b.boosted_until && new Date(b.boosted_until) > now ? 1 : 0
        if (aBoosted !== bBoosted) return bBoosted - aBoosted

        // Everything else by date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }

    // Append or replace posts (with windowing to limit memory usage)
    if (append) {
      setPosts(prev => {
        const combined = [...prev, ...postsWithVotes]
        // Keep only the most recent MAX_POSTS to prevent memory bloat
        if (combined.length > MAX_POSTS) {
          return combined.slice(-MAX_POSTS)
        }
        return combined
      })
    } else {
      setPosts(postsWithVotes)
      // Cache the first page for instant load next time
      if (postsWithVotes.length > 0) {
        setFeedCache({
          version: FEED_CACHE_VERSION,
          timestamp: Date.now(),
          userId: session.nullifier_hash,
          posts: postsWithVotes.slice(0, POSTS_PER_PAGE),
          hiddenUsers: Array.from(blockedUserIds),
          followedUsers: Array.from(followedUserIds),
        })
      }
    }
    setIsLoading(false)
    setIsLoadingMore(false)
    setIsRefreshing(false)
  }

  // Pull-to-refresh handlers - use native TouchEvent for passive: false support
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY <= SCROLL_TOLERANCE) {
      touchStartY.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isRefreshing || touchStartY.current === 0) return

    const currentY = e.touches[0].clientY
    const diff = currentY - touchStartY.current

    if (diff > 0 && window.scrollY <= SCROLL_TOLERANCE) {
      // Prevent browser scroll interference during pull-to-refresh
      e.preventDefault()
      // Dampen the pull effect
      const dampedDiff = Math.min(diff * 0.5, 120)
      setPullDistance(dampedDiff)
    }
  }, [isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing && currentSession) {
      // Haptic feedback when refresh triggers
      hapticSelection()
      setIsRefreshing(true)
      setPullDistance(0)
      setPage(0)
      setHasMore(true)
      setNewPostCount(0)
      await fetchPosts(currentSession)
    } else {
      setPullDistance(0)
    }
    touchStartY.current = 0
  }, [pullDistance, isRefreshing, currentSession])

  // Attach native touch event listeners with passive: false for pull-to-refresh
  useEffect(() => {
    const element = feedRef.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const handleLoadMore = useCallback(async () => {
    if (!currentSession || isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)
    await fetchPosts(currentSession, nextPage, true)
  }, [currentSession, isLoadingMore, hasMore, page])

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const loadMoreElement = loadMoreRef.current
    if (!loadMoreElement) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !isLoadingMore && currentSession) {
          handleLoadMore()
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before the element is visible
        threshold: 0,
      }
    )

    observer.observe(loadMoreElement)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, isLoadingMore, currentSession, handleLoadMore])

  const handleVote = async (postId: string, voteType: 'like' | 'dislike') => {
    const session = getSession()
    if (!session) return

    const post = posts.find(p => p.id === postId)
    if (!post) return

    // Haptic feedback for vote
    hapticLight()

    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p

      if (p.user_vote === voteType) {
        // Remove vote
        return {
          ...p,
          user_vote: null,
          like_count: voteType === 'like' ? p.like_count - 1 : p.like_count,
          dislike_count: voteType === 'dislike' ? p.dislike_count - 1 : p.dislike_count,
        }
      } else {
        // Add or switch vote
        const wasLike = p.user_vote === 'like'
        const wasDislike = p.user_vote === 'dislike'
        return {
          ...p,
          user_vote: voteType,
          like_count: voteType === 'like' ? p.like_count + 1 : (wasLike ? p.like_count - 1 : p.like_count),
          dislike_count: voteType === 'dislike' ? p.dislike_count + 1 : (wasDislike ? p.dislike_count - 1 : p.dislike_count),
        }
      }
    }))

    // Persist to database
    if (post.user_vote === voteType) {
      // Delete existing vote
      await supabase
        .from('post_votes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', session.nullifier_hash)
    } else {
      // Upsert vote
      await supabase
        .from('post_votes')
        .upsert({
          post_id: postId,
          user_id: session.nullifier_hash,
          vote_type: voteType,
        }, { onConflict: 'post_id,user_id' })

      // Notify post creator of like (not for own posts, not when switching from dislike)
      if (voteType === 'like' && post.user_vote !== 'dislike' && post.user_id !== session.nullifier_hash && post.users?.wallet_address && session.first_name) {
        sendNotification(
          [post.users.wallet_address],
          'Someone liked your post!',
          `${session.first_name} liked your post`,
          `/feed?scrollTo=${postId}`
        )
      }
    }
  }

  const handleHideUser = async (userAddress: string) => {
    const session = getSession()
    if (!session) return

    // Optimistically hide posts from this user
    setHiddenUsers(prev => new Set([...prev, userAddress]))
    setPosts(prev => prev.filter(p => p.user_id !== userAddress))

    // Persist to database
    await supabase
      .from('relationships')
      .upsert({
        follower_id: session.nullifier_hash,
        target_id: userAddress,
        type: 'block',
      }, { onConflict: 'follower_id,target_id' })
  }

  const handleDeletePost = (postId: string) => {
    setOpenMenuId(null)
    setDeletePostId(postId)
  }

  const confirmDeletePost = async () => {
    if (!deletePostId) return

    const session = getSession()
    if (!session) return

    setIsDeleting(true)

    // Get the post to find its media
    const post = posts.find(p => p.id === deletePostId)

    // Optimistically remove from state
    setPosts(prev => prev.filter(p => p.id !== deletePostId))

    // Delete media from storage before deleting post from DB
    if (post) {
      // Handle legacy Supabase Storage images
      if (post.image_url) {
        const filename = post.image_url.split('/photos/')[1]?.split('?')[0]
        if (filename) {
          await supabase.storage.from('photos').remove([filename])
        }
      }

      // Handle S3 media (albums and reels)
      if (post.media_urls && post.media_urls.length > 0) {
        const keysToDelete = post.media_urls.map(m => m.key)
        if (post.thumbnail_url) {
          keysToDelete.push(post.thumbnail_url)
        }
        try {
          await fetch('/api/s3-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keys: keysToDelete }),
          })
        } catch (error) {
          console.error('Failed to delete S3 objects:', error)
        }
      }
    }

    // Delete from database
    await supabase
      .from('posts')
      .delete()
      .eq('id', deletePostId)
      .eq('user_id', session.nullifier_hash)

    setIsDeleting(false)
    setDeletePostId(null)
  }

  const handleStartEdit = (post: Post) => {
    setOpenMenuId(null)
    setEditingPostId(post.id)
    setEditCaption(post.caption || '')
  }

  const handleSaveEdit = async (postId: string) => {
    const session = getSession()
    if (!session) return

    // Update in database
    const { error } = await supabase
      .from('posts')
      .update({ caption: editCaption.trim() || null })
      .eq('id', postId)
      .eq('user_id', session.nullifier_hash)

    if (!error) {
      // Update local state
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, caption: editCaption.trim() || null } : p
      ))
    }

    setEditingPostId(null)
    setEditCaption('')
  }

  const handleCancelEdit = () => {
    setEditingPostId(null)
    setEditCaption('')
  }

  const handleUnlockPost = async () => {
    const session = getSession()
    if (!session || !unlockingPost) return

    const creatorWallet = unlockingPost.users?.wallet_address
    if (!creatorWallet) {
      setUnlockError('Creator wallet not found')
      return
    }

    // Ensure user has wallet connected before payment
    const myWallet = await ensureWalletConnected()
    if (!myWallet) {
      return
    }

    const UNLOCK_AMOUNT = 1.0
    const CREATOR_SHARE = 0.8  // 80% to creator
    const OWNER_SHARE = 0.2    // 20% to owner

    // Helper to add delay between payments
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    setUnlockStep(1)
    setUnlockError('')

    try {
      // Step 1: Pay platform fee to owner (0.2 WLD)
      const ownerReference = crypto.randomUUID().replace(/-/g, '').slice(0, 36)
      const ownerPayload: PayCommandInput = {
        reference: ownerReference,
        to: process.env.NEXT_PUBLIC_OWNER_WALLET!,
        tokens: [{
          symbol: Tokens.WLD,
          token_amount: tokenToDecimals(UNLOCK_AMOUNT * OWNER_SHARE, Tokens.WLD).toString(),
        }],
        description: 'Platform fee',
      }

      const { finalPayload: ownerPayment } = await MiniKit.commandsAsync.pay(ownerPayload)

      if (ownerPayment.status !== 'success') {
        setUnlockError('Platform fee payment was not completed')
        setUnlockStep(0)
        return
      }

      // Add delay before second payment
      await delay(1500)
      setUnlockStep(2)

      // Step 2: Pay creator directly (0.8 WLD)
      const creatorReference = crypto.randomUUID().replace(/-/g, '').slice(0, 36)
      const creatorPayload: PayCommandInput = {
        reference: creatorReference,
        to: creatorWallet,
        tokens: [{
          symbol: Tokens.WLD,
          token_amount: tokenToDecimals(UNLOCK_AMOUNT * CREATOR_SHARE, Tokens.WLD).toString(),
        }],
        description: `Payment to ${unlockingPost.users?.first_name || 'creator'}`,
      }

      const { finalPayload: creatorPayment } = await MiniKit.commandsAsync.pay(creatorPayload)

      if (creatorPayment.status !== 'success') {
        console.warn('Creator payment failed, but platform fee was paid')
        setUnlockError('Creator payment failed. Platform fee was collected.')
      }

      // Record access with creator share info
      const { error: insertError } = await supabase.from('post_access').insert({
        user_id: session.nullifier_hash,
        post_id: unlockingPost.id,
        amount: UNLOCK_AMOUNT,
        creator_id: unlockingPost.user_id,
        creator_wallet_address: creatorWallet,
        creator_share: UNLOCK_AMOUNT * CREATOR_SHARE,
        owner_share: UNLOCK_AMOUNT * OWNER_SHARE,
        payout_status: creatorPayment.status === 'success' ? 'paid' : 'failed',
      })

      if (insertError) {
        console.error('Error recording unlock:', insertError.message)
      }

      // Update local state to remove blur
      setPosts(prev => prev.map(p =>
        p.id === unlockingPost.id ? { ...p, has_access: true } : p
      ))

      if (creatorPayment.status === 'success') {
        // Notify creator of premium unlock
        if (creatorWallet && session.first_name) {
          sendNotification(
            [creatorWallet],
            'Premium content unlocked!',
            `${session.first_name} paid ${UNLOCK_AMOUNT} WLD for your content`,
            `/feed?scrollTo=${unlockingPost.id}`
          )
        }

        // Haptic feedback for successful unlock
        hapticSuccess()
        setUnlockingPost(null)
      }
    } catch (err) {
      console.error('Unlock error:', err)
      setUnlockError('Payment failed. Please try again.')
    }

    setUnlockStep(0)
  }

  const handleSharePost = async (post: Post) => {
    if (!MiniKit.isInstalled()) {
      // Fallback to native share for non-MiniKit browsers
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${post.users?.first_name}`,
          text: post.caption || 'Check out this post on Ojo!',
          url: `https://worldcoin.org/mini-app?app_id=${process.env.NEXT_PUBLIC_APP_ID}&path=/feed?scrollTo=${post.id}`,
        })
      }
      return
    }

    hapticLight()

    try {
      await MiniKit.commandsAsync.share({
        title: `Post by ${post.users?.first_name}`,
        text: post.caption || 'Check out this post on Ojo!',
        url: `https://worldcoin.org/mini-app?app_id=${process.env.NEXT_PUBLIC_APP_ID}&path=/feed?scrollTo=${post.id}`,
      })
    } catch (err) {
      console.error('Share error:', err)
    }
  }

  const handleShareToWorldChat = async (post: Post) => {
    if (!MiniKit.isInstalled()) {
      alert('Please open this app in World App')
      return
    }

    hapticLight()

    try {
      const postUrl = `https://worldcoin.org/mini-app?app_id=${process.env.NEXT_PUBLIC_APP_ID}&path=/feed?scrollTo=${post.id}`
      await MiniKit.commandsAsync.chat({
        message: `Check out this post on Ojo: ${postUrl}`,
      })
    } catch (err) {
      console.error('World Chat share error:', err)
    }
  }

  // Clear local blob URLs after remote media loads (memory cleanup)
  const clearLocalBlobs = useCallback((postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId && post.localBlobs) {
        // Revoke URLs before clearing to free memory
        if (post.localBlobs.localImageUrl) URL.revokeObjectURL(post.localBlobs.localImageUrl)
        post.localBlobs.localMediaUrls?.forEach(url => URL.revokeObjectURL(url))
        if (post.localBlobs.localVideoUrl) URL.revokeObjectURL(post.localBlobs.localVideoUrl)
        if (post.localBlobs.localThumbnailUrl) URL.revokeObjectURL(post.localBlobs.localThumbnailUrl)
        return { ...post, localBlobs: undefined }
      }
      return post
    }))
  }, [])

  const handleBoostPost = async (postId: string) => {
    setOpenMenuId(null)

    const session = getSession()
    if (!session) return

    // Ensure user has wallet connected before payment
    const myWallet = await ensureWalletConnected()
    if (!myWallet) {
      return
    }

    const reference = crypto.randomUUID().replace(/-/g, '').slice(0, 36)

    const payload: PayCommandInput = {
      reference,
      to: process.env.NEXT_PUBLIC_OWNER_WALLET!,
      tokens: [{
        symbol: Tokens.WLD,
        token_amount: tokenToDecimals(5, Tokens.WLD).toString(),
      }],
      description: 'Boost post for 24 hours',
    }

    try {
      const { finalPayload } = await MiniKit.commandsAsync.pay(payload)

      if (finalPayload.status === 'success') {
        // Haptic feedback for successful boost
        hapticSuccess()

        // Update boosted_until in database
        const boostedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

        await supabase
          .from('posts')
          .update({ boosted_until: boostedUntil })
          .eq('id', postId)
          .eq('user_id', session.nullifier_hash)

        // Refresh feed to show new order
        fetchPosts(session)
      }
    } catch (err) {
      console.error('Boost error:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center">
            <span className="relative">
              O
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-2.5 h-2.5 bg-current rounded-full"></span>
              </span>
            </span>
            <span>J</span>
            <span className="relative">
              O
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-2.5 h-2.5 bg-current rounded-full"></span>
              </span>
            </span>
          </h1>
          <p className="text-gray-500">Keep an eye on what is real</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={feedRef}
      className="min-h-screen bg-gray-50 relative"
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-20 transition-transform duration-150"
        style={{ transform: `translateY(${pullDistance - 40}px)` }}
      >
        {isRefreshing ? (
          <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
        ) : pullDistance > 0 && (
          <div className={`transition-transform ${pullDistance >= PULL_THRESHOLD ? 'text-black' : 'text-gray-400'}`}>
            <svg
              className={`w-6 h-6 transition-transform ${pullDistance >= PULL_THRESHOLD ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        )}
      </div>

      {/* New posts notification pill */}
      {newPostCount > 0 && (
        <button
          onClick={() => {
            setNewPostCount(0)
            fetchPosts(currentSession!)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="fixed top-20 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg z-30 flex items-center gap-2 hover:bg-blue-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {newPostCount} new {newPostCount === 1 ? 'post' : 'posts'}
        </button>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 animated-gradient-header text-white z-40">
        <div className="w-full md:max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center">
            <span className="relative">
              O
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
              </span>
            </span>
            <span>J</span>
            <span className="relative">
              O
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
              </span>
            </span>
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/discover')}
              className="p-2"
              title="Discover Users"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={async () => {
                // Clear unread count immediately
                setUnreadCount(0)

                // Update last_read_at for all user's connections
                const session = getSession()
                if (session) {
                  await supabase
                    .from('connections')
                    .update({ last_read_at: new Date().toISOString() })
                    .or(`initiator_id.eq.${session.nullifier_hash},receiver_id.eq.${session.nullifier_hash}`)
                }

                router.push('/inbox')
              }}
              className="relative p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium"
            >
              + Post
            </button>
            <button onClick={() => router.push(`/profile/${currentSession?.nullifier_hash}`)}>
              <UserAvatar
                avatarUrl={currentSession?.avatar_url}
                firstName={currentSession?.first_name}
                size="sm"
                showStatus={false}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Upload Modal */}
      {showUpload && (
        <UploadPost
          onClose={() => setShowUpload(false)}
          onSuccess={async (newPost) => {
            setShowUpload(false)
            if (currentSession) {
              // Construct full Post object for the new post
              const fullPost: Post = {
                id: newPost.id,
                user_id: currentSession.nullifier_hash,
                image_url: newPost.image_url,
                caption: newPost.caption,
                created_at: new Date().toISOString(),
                users: {
                  first_name: currentSession.first_name || '',
                  last_name: currentSession.last_name || '',
                  avatar_url: currentSession.avatar_url || null,
                  wallet_address: null,
                  status: null,
                  last_seen_at: new Date().toISOString(),
                },
                like_count: 0,
                dislike_count: 0,
                user_vote: null,
                total_tips: 0,
                is_premium: newPost.is_premium,
                has_access: true,
                boosted_until: null,
                media_type: newPost.media_type,
                media_urls: newPost.media_urls,
                thumbnail_url: newPost.thumbnail_url,
                localBlobs: newPost.localBlobs,
              }
              // Prepend to the top of the feed
              setPosts(prev => [fullPost, ...prev])
              // Scroll to top
              window.scrollTo({ top: 0, behavior: 'smooth' })

              // Check if this is the user's first post and complete referral
              const { count } = await supabase
                .from('posts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', currentSession.nullifier_hash)

              // If this is the first post (count === 1), mark referral as completed
              if (count === 1) {
                await supabase
                  .from('referrals')
                  .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                  })
                  .eq('referred_id', currentSession.nullifier_hash)
                  .eq('status', 'signed_up')
              }
            }
          }}
        />
      )}

      {/* Feed */}
      <main className="w-full md:max-w-2xl mx-auto pt-14">
        {posts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No posts yet. Be the first to share!
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} id={`post-${post.id}`} className="bg-white border-b border-gray-200">
              {/* Post Header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <button
                  onClick={() => router.push(`/profile/${post.user_id}`)}
                  className="flex items-center gap-3"
                >
                  <UserAvatar
                    avatarUrl={post.users?.avatar_url}
                    firstName={post.users?.first_name}
                    lastSeenAt={post.users?.last_seen_at}
                    size="sm"
                  />
                  <span className="font-medium text-sm">
                    {post.users?.first_name} {post.users?.last_name}
                  </span>
                  {post.boosted_until && new Date(post.boosted_until) > new Date() && (
                    <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-600 text-xs rounded-full">
                      Boosted
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  {/* Show ChatButton and Menu for OTHER users' posts */}
                  {currentSession && post.user_id !== currentSession.nullifier_hash && (
                    <>
                      <ChatButton targetUserAddress={post.user_id} />
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenOtherMenuId(openOtherMenuId === post.id ? null : post.id)
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 transition"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                        {/* Dropdown Menu for other users' posts */}
                        {openOtherMenuId === post.id && (
                          <div
                            className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-20 min-w-[140px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setOpenOtherMenuId(null)
                                handleShareToWorldChat(post)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-blue-500 hover:bg-gray-100"
                            >
                              Share to Chat
                            </button>
                            <button
                              onClick={() => {
                                setOpenOtherMenuId(null)
                                handleHideUser(post.user_id)
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                            >
                              Hide User
                            </button>
                            <button
                              onClick={() => {
                                setOpenOtherMenuId(null)
                                setReportingPostId(post.id)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-100"
                            >
                              Report
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {/* Show Three-Dots Menu for OWN posts */}
                  {currentSession && post.user_id === currentSession.nullifier_hash && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(openMenuId === post.id ? null : post.id)
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 transition"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                      {/* Dropdown Menu */}
                      {openMenuId === post.id && (
                        <div
                          className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-20 min-w-[140px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleStartEdit(post)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setOpenMenuId(null)
                              handleShareToWorldChat(post)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-blue-500 hover:bg-gray-100"
                          >
                            Share to Chat
                          </button>
                          <button
                            onClick={() => handleBoostPost(post.id)}
                            className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-gray-100"
                          >
                            Boost (5 WLD)
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-100"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Post Media (Image/Album/Reel) */}
              <PostMedia
                post={post}
                onImageClick={(urls, index) => {
                  if (!post.is_premium || post.has_access) {
                    window.history.pushState(null, '', '#view')
                    setViewingImage({ urls, currentIndex: index, caption: post.caption || undefined })
                  }
                }}
                onUnlock={() => setUnlockingPost(post)}
                onMediaLoaded={clearLocalBlobs}
              />

              {/* Vote Buttons */}
              <div className="flex items-center gap-4 px-4 py-2">
                <button
                  onClick={() => handleVote(post.id, 'like')}
                  className={`flex items-center gap-1 transition ${
                    post.user_vote === 'like' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg
                    className="w-6 h-6"
                    fill={post.user_vote === 'like' ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                    />
                  </svg>
                  <span className="text-sm font-medium">{post.like_count}</span>
                </button>
                <button
                  onClick={() => handleVote(post.id, 'dislike')}
                  className={`flex items-center gap-1 transition ${
                    post.user_vote === 'dislike' ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg
                    className="w-6 h-6"
                    fill={post.user_vote === 'dislike' ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                    />
                  </svg>
                  <span className="text-sm font-medium">{post.dislike_count}</span>
                </button>

                {/* Tip Button - only for other users' posts */}
                {currentSession && post.user_id !== currentSession.nullifier_hash && (
                  <TipButton
                    postId={post.id}
                    authorAddress={post.user_id}
                    authorWalletAddress={post.users?.wallet_address}
                    authorName={post.users?.first_name || 'User'}
                    onTipSuccess={() => {
                      setPosts(prev => prev.map(p =>
                        p.id === post.id ? { ...p, total_tips: p.total_tips + 0.5 } : p
                      ))
                    }}
                  />
                )}

                {/* Share Button */}
                <button
                  onClick={() => handleSharePost(post)}
                  className="text-gray-500 hover:text-gray-700 transition ml-auto"
                  title="Share post"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>

                {/* Total Tips Display */}
                {post.total_tips > 0 && (
                  <span className="text-amber-500 text-sm font-medium">
                    {post.total_tips} WLD
                  </span>
                )}
              </div>

              {/* Post Caption */}
              {editingPostId === post.id ? (
                <div className="px-4 py-2">
                  <textarea
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    className="w-full p-2 border rounded-lg resize-none focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                    rows={2}
                    placeholder="Add a caption..."
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleSaveEdit(post.id)}
                      className="px-3 py-1 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 border text-sm rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                post.caption && (
                  <div className="px-4 py-2">
                    <p className="text-sm">
                      <span className="font-medium">{post.users?.first_name}</span>{' '}
                      {post.caption}
                    </p>
                  </div>
                )
              )}

              {/* Post Time */}
              <div className="px-4 pb-3">
                <time className="text-xs text-gray-400">
                  {new Date(post.created_at).toLocaleDateString()}
                </time>
              </div>
            </article>
          ))
        )}

        {/* Infinite scroll trigger / Load More */}
        <div ref={loadMoreRef} className="p-4">
          {hasMore && posts.length > 0 && (
            <div className="flex justify-center py-4">
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  <span>Loading more posts...</span>
                </div>
              ) : (
                <button
                  onClick={handleLoadMore}
                  className="text-blue-500 font-medium hover:underline"
                >
                  Load More
                </button>
              )}
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p className="text-center text-gray-400 text-sm py-4">
              You've reached the end
            </p>
          )}
        </div>
      </main>

      {/* Report Modal */}
      {reportingPostId && (
        <ReportModal
          targetId={reportingPostId}
          targetType="post"
          onClose={() => setReportingPostId(null)}
          onSuccess={() => setReportingPostId(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deletePostId}
        onClose={() => setDeletePostId(null)}
        onConfirm={confirmDeletePost}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        isLoading={isDeleting}
      />

      {/* Image Viewer */}
      {viewingImage && (
        <ImageViewer
          imageUrls={viewingImage.urls}
          currentIndex={viewingImage.currentIndex}
          alt={viewingImage.caption}
          onClose={() => window.history.back()}
        />
      )}

      {/* Unlock Premium Post Modal */}
      {unlockingPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-center mb-2">Unlock Premium Post</h3>
            <p className="text-gray-500 text-center mb-4">
              Unlock @{unlockingPost.users?.first_name}'s premium content
            </p>

            {/* Breakdown */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className={`flex justify-between mb-1 ${unlockStep === 1 ? 'text-amber-600 font-medium' : ''}`}>
                <span className={unlockStep === 1 ? 'text-amber-600' : 'text-gray-500'}>
                  1. Platform fee {unlockStep === 1 && '⏳'}
                </span>
                <span className={unlockStep === 1 ? 'text-amber-600' : 'text-gray-400'}>0.2 WLD</span>
              </div>
              <div className={`flex justify-between mb-1 ${unlockStep === 2 ? 'text-amber-600 font-medium' : ''}`}>
                <span className={unlockStep === 2 ? 'text-amber-600' : 'text-gray-500'}>
                  2. Creator receives {unlockStep === 2 && '⏳'}
                </span>
                <span className={unlockStep === 2 ? 'text-amber-600' : 'font-medium'}>0.8 WLD</span>
              </div>
              <div className="border-t pt-1 mt-1 flex justify-between font-medium">
                <span>Total (2 transactions)</span>
                <span>1.0 WLD</span>
              </div>
            </div>

            {unlockError && (
              <p className="text-red-500 text-sm text-center mb-4">{unlockError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setUnlockingPost(null)
                  setUnlockError('')
                  setUnlockStep(0)
                }}
                disabled={unlockStep > 0}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlockPost}
                disabled={unlockStep > 0}
                className="flex-1 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50"
              >
                {unlockStep > 0
                  ? unlockStep === 1
                    ? 'Processing 1/2...'
                    : 'Processing 2/2...'
                  : 'Unlock 1.0 WLD'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">Loading feed...</p></div>}>
      <FeedContent />
    </Suspense>
  )
}
