'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { MiniKit } from '@worldcoin/minikit-js'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { getProfileCacheEntry, setProfileCacheEntry } from '@/lib/profileCache'
import { hapticMedium, hapticLight } from '@/lib/haptics'
import ReportModal from '@/components/ReportModal'
import ChatButton from '@/components/ChatButton'

interface User {
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

interface Post {
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

interface Visitor {
  nullifier_hash: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const params = useParams()
  const profileId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [viewCount, setViewCount] = useState(0)
  const [recentVisitors, setRecentVisitors] = useState<Visitor[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [tipsEarned, setTipsEarned] = useState(0)

  useEffect(() => {
    const session = getSession()
    const isOwn = session && session.nullifier_hash === profileId
    setIsOwnProfile(!!isOwn)

    // Try to load from cache first for instant display
    if (session) {
      const cached = getProfileCacheEntry(session.nullifier_hash, profileId)
      if (cached) {
        setUser(cached.user)
        setPosts(cached.posts)
        setViewCount(cached.viewCount)
        setRecentVisitors(cached.visitors)
        setFollowerCount(cached.followerCount)
        setIsFollowing(cached.isFollowing)
        if (isOwn) {
          setTipsEarned(cached.tipsEarned)
        }
        setIsLoading(false)
      }
    }

    const fetchProfile = async () => {
      // Track values for caching
      let followingStatus = false
      let finalTipsEarned = 0

      // Fetch user data (profileId is nullifier_hash)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('nullifier_hash, wallet_address, first_name, last_name, country, avatar_url, created_at, sex, age')
        .eq('nullifier_hash', profileId)
        .single()

      if (userError) {
        console.error('Error fetching user:', userError)
        setIsLoading(false)
        return
      }

      setUser(userData)

      // Fetch user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, image_url, caption, created_at, is_premium, users:user_id(wallet_address)')
        .eq('user_id', profileId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })

      if (postsError) {
        console.error('Error fetching posts:', postsError)
      }

      // Check access for premium posts
      // Helper to normalize the users field (Supabase may return object or array)
      const normalizeUsers = (users: unknown): { wallet_address: string | null } | null => {
        if (!users) return null
        if (Array.isArray(users)) return users[0] || null
        return users as { wallet_address: string | null }
      }

      let postsWithAccess: Post[] = []
      if (session && postsData) {
        const premiumPostIds = postsData.filter(p => p.is_premium).map(p => p.id)
        if (premiumPostIds.length > 0) {
          const { data: accessData } = await supabase
            .from('post_access')
            .select('post_id')
            .eq('user_id', session.nullifier_hash)
            .in('post_id', premiumPostIds)

          const unlockedIds = new Set(accessData?.map(a => a.post_id) || [])
          postsWithAccess = postsData.map(post => ({
            id: post.id,
            image_url: post.image_url,
            caption: post.caption,
            created_at: post.created_at,
            is_premium: post.is_premium,
            has_access: !post.is_premium || unlockedIds.has(post.id) || !!isOwn,
            users: normalizeUsers(post.users)
          }))
        } else {
          postsWithAccess = postsData.map(post => ({
            id: post.id,
            image_url: post.image_url,
            caption: post.caption,
            created_at: post.created_at,
            is_premium: post.is_premium,
            has_access: true,
            users: normalizeUsers(post.users)
          }))
        }
      } else {
        // Not logged in - no access to premium posts
        postsWithAccess = (postsData || []).map(post => ({
          id: post.id,
          image_url: post.image_url,
          caption: post.caption,
          created_at: post.created_at,
          is_premium: post.is_premium,
          has_access: !post.is_premium,
          users: normalizeUsers(post.users)
        }))
      }
      setPosts(postsWithAccess)

      // Check if current user follows this profile and record view
      console.log('Profile page:', { profileId, sessionUser: session?.nullifier_hash, isOwn })
      if (session && !isOwn) {
        // Fetch viewer's invisible status
        const { data: viewerData } = await supabase
          .from('users')
          .select('invisible_mode_expiry')
          .eq('nullifier_hash', session.nullifier_hash)
          .single()

        const isInvisible = viewerData?.invisible_mode_expiry &&
          new Date(viewerData.invisible_mode_expiry) > new Date()

        const { data: followData } = await supabase
          .from('relationships')
          .select('id')
          .eq('follower_id', session.nullifier_hash)
          .eq('target_id', profileId)
          .eq('type', 'follow')
          .maybeSingle()

        followingStatus = !!followData
        setIsFollowing(followingStatus)

        // Record profile view FIRST only if NOT invisible
        if (!isInvisible) {
          // Use insert - each view is a new record (allows multiple views over time)
          const { error: viewError } = await supabase.from('profile_views').insert({
            viewer_id: session.nullifier_hash,
            profile_id: profileId,
          })
          if (viewError) {
            console.error('Error recording profile view:', viewError.message, viewError.code, viewError.details)
          } else {
            console.log('Profile view recorded successfully')
          }
        } else {
          console.log('User is invisible, skipping view recording')
        }
      }

      // Fetch view count AFTER recording the view
      const { count: viewCountResult, error: viewCountError } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId)

      console.log('View count result:', { viewCountResult, viewCountError })
      setViewCount(viewCountResult || 0)

      // Fetch recent visitors AFTER recording the view
      const { data: visitorsData, error: visitorsError } = await supabase
        .from('profile_views')
        .select(`
          viewer_id,
          created_at,
          users!profile_views_viewer_id_fkey (
            nullifier_hash,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('profile_id', profileId)
        .neq('viewer_id', profileId)
        .order('created_at', { ascending: false })
        .limit(20)

      console.log('Visitors result:', { visitorsData, visitorsError })

      // Deduplicate by viewer_id, keep first 5
      const uniqueVisitors: Visitor[] = []
      const seen = new Set<string>()
      for (const v of visitorsData || []) {
        if (v.users && !seen.has(v.viewer_id) && uniqueVisitors.length < 5) {
          seen.add(v.viewer_id)
          const visitorData = v.users as unknown as Visitor
          uniqueVisitors.push(visitorData)
        }
      }
      setRecentVisitors(uniqueVisitors)

      // Fetch follower count
      const { count: followers } = await supabase
        .from('relationships')
        .select('*', { count: 'exact', head: true })
        .eq('target_id', profileId)
        .eq('type', 'follow')

      setFollowerCount(followers || 0)

      // Fetch total earnings ONLY for own profile (private data)
      // Uses RPC functions for efficient server-side aggregation
      if (isOwn) {
        // Fetch tips earned using RPC (single query with SUM)
        const { data: tipsTotal, error: tipsError } = await supabase
          .rpc('get_user_tips_total', { p_user_id: profileId })

        // Fetch premium post unlock earnings using RPC (single query with SUM)
        const { data: premiumTotal, error: premiumError } = await supabase
          .rpc('get_user_premium_total', { p_user_id: profileId })

        const totalTips = Number(tipsTotal) || 0
        const totalPremium = Number(premiumTotal) || 0

        if (tipsError) console.error('Tips RPC error:', tipsError)
        if (premiumError) console.error('Premium RPC error:', premiumError)

        setTipsEarned(totalTips + totalPremium)
        finalTipsEarned = totalTips + totalPremium
      }

      // Cache the profile data for instant load next time
      if (session && userData) {
        setProfileCacheEntry(session.nullifier_hash, profileId, {
          user: userData,
          posts: postsWithAccess,
          viewCount: viewCountResult || 0,
          visitors: uniqueVisitors,
          followerCount: followers || 0,
          isFollowing: followingStatus,
          tipsEarned: finalTipsEarned,
        })
      }

      setIsLoading(false)
    }

    fetchProfile()
  }, [profileId])

  const handleFollowToggle = async () => {
    const session = getSession()
    if (!session || isOwnProfile) return

    // Haptic feedback for follow/unfollow
    hapticMedium()

    setIsFollowLoading(true)

    if (isFollowing) {
      // Unfollow: delete relationship
      const { error } = await supabase
        .from('relationships')
        .delete()
        .eq('follower_id', session.nullifier_hash)
        .eq('target_id', profileId)
        .eq('type', 'follow')

      if (error) {
        console.error('Error unfollowing:', error)
        setIsFollowLoading(false)
        return
      }
    } else {
      // Follow: insert relationship
      const { error } = await supabase
        .from('relationships')
        .insert({
          follower_id: session.nullifier_hash,
          target_id: profileId,
          type: 'follow',
        })

      if (error) {
        console.error('Error following:', error.message, error.code, error.details)
        setIsFollowLoading(false)
        return
      }
      console.log('Followed successfully')
    }

    setIsFollowing(!isFollowing)
    setFollowerCount(prev => isFollowing ? prev - 1 : prev + 1)
    setIsFollowLoading(false)
  }

  const handleShareProfile = async () => {
    if (!user) return

    hapticLight()

    const shareData = {
      title: `${user.first_name}'s Profile on Ojo`,
      text: 'Check out this verified human on Ojo!',
      url: `https://worldcoin.org/mini-app?app_id=${process.env.NEXT_PUBLIC_APP_ID}&path=/profile/${profileId}`,
    }

    if (!MiniKit.isInstalled()) {
      // Fallback to native share
      if (navigator.share) {
        await navigator.share(shareData)
      }
      return
    }

    try {
      await MiniKit.commandsAsync.share(shareData)
    } catch (err) {
      console.error('Share profile error:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">User not found</p>
          <button
            onClick={() => router.push('/feed')}
            className="text-black underline"
          >
            Go to Feed
          </button>
        </div>
      </div>
    )
  }

  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">Profile</h1>
        <button
          onClick={handleShareProfile}
          className="text-gray-600 hover:text-gray-900"
          title="Share profile"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>

      {/* Profile Info */}
      <div className="bg-white px-4 py-6 border-b">
        <div className="flex flex-col items-center">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden mb-4">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={`${user.first_name}'s avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-gray-500 font-semibold">
                {user.first_name?.[0] || '?'}
              </div>
            )}
          </div>

          {/* Name */}
          <h2 className="text-xl font-bold">
            {user.first_name} {user.last_name}
          </h2>

          {/* Country */}
          {user.country && (
            <p className="text-gray-500 mt-1">{user.country}</p>
          )}

          {/* Demographics */}
          {(user.age || user.sex) && (
            <p className="text-gray-500 mt-1">
              {user.sex}{user.sex && user.age && ', '}{user.age && `${user.age} years old`}
            </p>
          )}

          {/* Join Date */}
          <p className="text-gray-400 text-sm mt-1">Joined {joinDate}</p>

          {/* Stats */}
          <div className="flex gap-6 mt-3">
            <div className="text-center">
              <p className="text-gray-900 font-semibold">{viewCount}</p>
              <p className="text-gray-500 text-xs">Views</p>
            </div>
            <button
              onClick={() => router.push(`/profile/${profileId}/followers`)}
              className="text-center hover:opacity-70 transition"
            >
              <p className="text-gray-900 font-semibold">{followerCount}</p>
              <p className="text-gray-500 text-xs">Followers</p>
            </button>
            {isOwnProfile && (
              <div className="text-center">
                <p className="text-amber-600 font-semibold">{tipsEarned.toFixed(1)} WLD</p>
                <p className="text-gray-500 text-xs">Earned</p>
              </div>
            )}
          </div>

          {/* Edit Button (own profile only) */}
          {isOwnProfile && (
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => router.push('/profile/edit')}
                className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Edit Profile
              </button>
              {/* Admin link - only shown to admin on their own profile */}
              {profileId === process.env.NEXT_PUBLIC_ADMIN_ID && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
                >
                  Admin Dashboard
                </button>
              )}
            </div>
          )}

          {/* Follow, Chat and Report Buttons (other profiles only) */}
          {!isOwnProfile && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
                className={`flex-1 px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 ${
                  isFollowing
                    ? 'border border-gray-300 hover:bg-gray-50'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {isFollowLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </button>
              <div className="px-4 py-2 border border-gray-300 rounded-lg text-blue-500 hover:bg-blue-50 transition">
                <ChatButton targetUserAddress={profileId} />
              </div>
              <button
                onClick={() => setShowReportModal(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-500 hover:text-red-500 hover:border-red-300 transition"
                title="Report user"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Visitors */}
      {recentVisitors.length > 0 && (
        <div className="bg-white px-4 py-4 border-b">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Recent Visitors
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentVisitors.map((visitor) => (
              <button
                key={visitor.nullifier_hash}
                onClick={() => router.push(`/profile/${visitor.nullifier_hash}`)}
                className="flex flex-col items-center flex-shrink-0"
              >
                <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden">
                  {visitor.avatar_url ? (
                    <img
                      src={visitor.avatar_url}
                      alt={visitor.first_name || 'Visitor'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium">
                      {visitor.first_name?.[0] || '?'}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500 mt-1 truncate max-w-[60px]">
                  {visitor.first_name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
          Posts ({posts.length})
        </h3>

        {posts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No posts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/feed?scrollTo=${post.id}`}
                className="aspect-square bg-gray-100 overflow-hidden block relative"
              >
                <img
                  src={post.image_url}
                  alt={post.caption || 'Post'}
                  className={`w-full h-full object-cover ${
                    post.is_premium && !post.has_access ? 'blur-lg' : ''
                  }`}
                />
                {post.is_premium && !post.has_access && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4z"/>
                    </svg>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Report User Modal */}
      {showReportModal && user && (
        <ReportModal
          targetId={profileId}
          targetType="user"
          targetName={user.first_name || undefined}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => setShowReportModal(false)}
        />
      )}
    </div>
  )
}
