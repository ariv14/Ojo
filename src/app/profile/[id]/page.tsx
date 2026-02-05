'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { MiniKit } from '@worldcoin/minikit-js'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { getProfileCacheEntry, setProfileCacheEntry } from '@/lib/profileCache'
import { hapticMedium, hapticLight } from '@/lib/haptics'
import { sendNotification } from '@/lib/notify'
import { getS3PublicUrl, resolveImageUrl } from '@/lib/s3'
import ReportModal from '@/components/ReportModal'
import ChatButton from '@/components/ChatButton'
import Header from '@/components/Header'
import UserAvatar from '@/components/UserAvatar'
import { SkeletonPost } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import { Share2, BadgeCheck, Camera, Lock, Layers, Video, RefreshCw, AlertTriangle, Images } from 'lucide-react'
import AppBackground from '@/components/ui/AppBackground'
import BottomNav from '@/components/BottomNav'

interface User {
  nullifier_hash: string
  wallet_address: string | null
  username: string | null
  first_name: string | null
  last_name: string | null
  country: string | null
  avatar_url: string | null
  created_at: string
  sex: string | null
  age: number | null
  bio: string | null
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
  media_type?: 'image' | 'album' | 'reel'
  media_urls?: { key: string; type: string }[]
  thumbnail_url?: string
  original_post_id?: string | null
  original?: {
    image_url?: string
    thumbnail_url?: string
    media_urls?: { key: string; type: string }[]
    media_type?: 'image' | 'album' | 'reel'
  }
}

interface Visitor {
  nullifier_hash: string
  username: string | null
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
        .select('nullifier_hash, wallet_address, username, first_name, last_name, country, avatar_url, created_at, sex, age, bio')
        .eq('nullifier_hash', profileId)
        .single()

      if (userError) {
        console.error('Error fetching user:', userError)
        setIsLoading(false)
        return
      }

      setUser(userData)

      // Fetch user's posts (including reshares)
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, image_url, caption, created_at, is_premium, media_type, media_urls, thumbnail_url, original_post_id, users:user_id(wallet_address)')
        .eq('user_id', profileId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })

      if (postsError) {
        console.error('Error fetching posts:', postsError)
      }

      // Fetch original posts for reshares
      const originalPostIds = postsData
        ?.map(p => (p as unknown as { original_post_id: string | null }).original_post_id)
        .filter((id): id is string => !!id) || []

      let originalPostsMap: Record<string, { image_url: string | null; thumbnail_url: string | null; media_urls: { key: string; type: string }[] | null; media_type: string | null }> = {}
      if (originalPostIds.length > 0) {
        const { data: originalPosts } = await supabase
          .from('posts')
          .select('id, image_url, thumbnail_url, media_urls, media_type')
          .in('id', originalPostIds)

        originalPosts?.forEach(op => {
          originalPostsMap[op.id] = {
            image_url: op.image_url,
            thumbnail_url: (op as unknown as { thumbnail_url: string | null }).thumbnail_url,
            media_urls: (op as unknown as { media_urls: { key: string; type: string }[] | null }).media_urls,
            media_type: (op as unknown as { media_type: string | null }).media_type,
          }
        })
      }

      // Check access for premium posts
      // Helper to normalize the users field (Supabase may return object or array)
      const normalizeUsers = (users: unknown): { wallet_address: string | null } | null => {
        if (!users) return null
        if (Array.isArray(users)) return users[0] || null
        return users as { wallet_address: string | null }
      }

      // Helper to map post data with reshare support
      type PostData = NonNullable<typeof postsData>[number]
      const mapPost = (post: PostData, hasAccess: boolean): Post => {
        const originalPostId = (post as unknown as { original_post_id: string | null }).original_post_id
        const isReshare = !!originalPostId
        const originalPost = originalPostId ? originalPostsMap[originalPostId] : null

        return {
          id: post.id,
          image_url: isReshare && originalPost ? originalPost.image_url || '' : post.image_url,
          caption: post.caption,
          created_at: post.created_at,
          is_premium: post.is_premium,
          has_access: hasAccess,
          users: normalizeUsers(post.users),
          media_type: isReshare && originalPost
            ? originalPost.media_type as 'image' | 'album' | 'reel' | undefined
            : (post as unknown as { media_type?: 'image' | 'album' | 'reel' }).media_type,
          media_urls: isReshare && originalPost
            ? originalPost.media_urls || undefined
            : (post as unknown as { media_urls?: { key: string; type: string }[] }).media_urls,
          thumbnail_url: isReshare && originalPost
            ? originalPost.thumbnail_url || undefined
            : (post as unknown as { thumbnail_url?: string }).thumbnail_url,
          original_post_id: originalPostId,
          original: originalPost ? {
            image_url: originalPost.image_url || undefined,
            thumbnail_url: originalPost.thumbnail_url || undefined,
            media_urls: originalPost.media_urls || undefined,
            media_type: originalPost.media_type as 'image' | 'album' | 'reel' | undefined,
          } : undefined,
        }
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
          postsWithAccess = postsData.map(post =>
            mapPost(post, !post.is_premium || unlockedIds.has(post.id) || !!isOwn)
          )
        } else {
          postsWithAccess = postsData.map(post => mapPost(post, true))
        }
      } else {
        // Not logged in - no access to premium posts
        postsWithAccess = (postsData || []).map(post => mapPost(post, !post.is_premium))
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
            // Notify profile owner of view
            const viewerName = session.username || session.first_name
            if (userData?.wallet_address && viewerName) {
              sendNotification(
                [userData.wallet_address],
                'Profile view',
                `${viewerName} viewed your profile`,
                '/feed'
              )
            }
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
            username,
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

      // Notify the user being followed
      const followerName = session.username || session.first_name
      if (user?.wallet_address && followerName) {
        sendNotification(
          [user.wallet_address],
          'New follower!',
          `${followerName} started following you`,
          '/feed'
        )
      }
    }

    setIsFollowing(!isFollowing)
    setFollowerCount(prev => isFollowing ? prev - 1 : prev + 1)
    setIsFollowLoading(false)
  }

  const handleShareProfile = async () => {
    if (!user) return

    hapticLight()

    const displayName = user.username || user.first_name || 'User'
    const shareData = {
      title: `${displayName}'s Profile on Ojo`,
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
      <div className="min-h-screen bg-[var(--obsidian)]">
        <Header showBackButton />
        <AppBackground>
          <div className="w-full md:max-w-2xl mx-auto flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 spinner-iris" />
              <p className="text-sm text-[var(--text-secondary)]">Loading profile...</p>
            </div>
          </div>
        </AppBackground>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--obsidian)]">
        <AppBackground>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <p className="text-[var(--text-secondary)] mb-4">User not found</p>
              <button
                onClick={() => router.push('/feed')}
                className="text-[var(--iris-blue)] underline"
              >
                Go to Feed
              </button>
            </div>
          </div>
        </AppBackground>
      </div>
    )
  }

  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[var(--obsidian)]">
      {/* Header */}
      <Header
        showBackButton
        onBack={() => router.back()}
        rightContent={
          <button
            onClick={handleShareProfile}
            className="header-icon-btn"
            title="Share profile"
          >
            <Share2 className="w-[18px] h-[18px]" />
          </button>
        }
      />

      <AppBackground>
        {/* Profile Info */}
        <div className="bg-[#1A1A2E] border-b border-[#2A2A3E] relative overflow-hidden">
        {/* Simple gradient hero background */}
        <div className="absolute inset-x-0 top-0 h-32 bg-[#00D4FF]/10" />
        <div className="w-full md:max-w-2xl mx-auto px-4 py-6 relative">
          <div className="flex flex-col items-center">
          {/* Avatar */}
          <div className="mb-4 mt-4 rounded-full">
            <UserAvatar
              avatarUrl={user.avatar_url}
              username={user.username || user.first_name}
              size="lg"
              showStatus={false}
              ring
            />
          </div>

          {/* Name */}
          <h2 className="text-xl font-bold flex items-center gap-1.5 text-[var(--sclera-white)]">
            {user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Anonymous'}
            <BadgeCheck className="w-5 h-5 text-[var(--iris-blue)]" />
          </h2>

          {/* Country */}
          {user.country && (
            <p className="text-[var(--text-secondary)] mt-1">{user.country}</p>
          )}

          {/* Demographics */}
          {(user.age || user.sex) && (
            <p className="text-[var(--text-secondary)] mt-1">
              {user.sex}{user.sex && user.age && ', '}{user.age && `${user.age} years old`}
            </p>
          )}

          {/* Bio */}
          {user.bio && (
            <p className="text-[var(--sclera-muted)] text-center mt-3 px-4 max-w-xs">
              {user.bio}
            </p>
          )}

          {/* Join Date */}
          <p className="text-[var(--text-tertiary)] text-sm mt-1">Joined {joinDate}</p>

          {/* Stats */}
          <div className="flex flex-row justify-center gap-3 py-6 w-full px-4">
            <div className="flex-1 text-center py-3 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E]">
              <p className="text-2xl font-bold text-[#F8F9FA]">{viewCount}</p>
              <p className="text-xs font-medium text-[#71717A]">Views</p>
            </div>
            <button onClick={() => router.push(`/profile/${profileId}/followers`)} className="flex-1 text-center py-3 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] hover:border-[#00D4FF] transition-colors">
              <p className="text-2xl font-bold text-[#00D4FF]">{followerCount}</p>
              <p className="text-xs font-medium text-[#71717A]">Followers</p>
            </button>
            {isOwnProfile && (
              <div className="flex-1 text-center py-3 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E]">
                <p className="text-2xl font-bold text-[#FFD700]">{tipsEarned.toFixed(1)}</p>
                <p className="text-xs font-medium text-[#71717A]">WLD Earned</p>
              </div>
            )}
          </div>

          {/* Edit Button (own profile only) */}
          {isOwnProfile && (
            <div className="flex gap-3 mt-6 w-full px-4">
              <button
                onClick={() => router.push('/profile/edit')}
                className="flex-1 py-2 btn-outline-dark"
              >
                Edit Profile
              </button>
              {profileId === process.env.NEXT_PUBLIC_ADMIN_ID && (
                <button
                  onClick={() => router.push('/admin')}
                  className="flex-1 py-2 btn-iris"
                >
                  Admin
                </button>
              )}
            </div>
          )}

          {/* Follow, Chat and Report Buttons (other profiles only) */}
          {!isOwnProfile && (
            <div className="flex items-center justify-center w-full gap-3 px-4 mt-6">
              <button
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
                className={`flex-1 h-10 rounded-full font-medium text-sm flex items-center justify-center transition-all disabled:opacity-50 active:scale-95 ${
                  isFollowing
                    ? 'btn-outline-dark'
                    : 'btn-iris'
                }`}
              >
                {isFollowLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </button>
              <div className="flex-1 h-10 bg-[var(--obsidian-elevated)] border border-[var(--border)] text-[var(--sclera-white)] rounded-full font-medium text-sm flex items-center justify-center transition hover:bg-[var(--obsidian-surface)]">
                <ChatButton targetUserAddress={profileId} />
              </div>
              <button
                onClick={() => setShowReportModal(true)}
                className="h-10 w-10 shrink-0 bg-[var(--obsidian-surface)] border border-[var(--border)] text-[var(--text-tertiary)] rounded-full flex items-center justify-center hover:text-[var(--error)] hover:border-[var(--error)]/30 transition"
                title="Report user"
              >
                <AlertTriangle className="w-5 h-5" />
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Recent Visitors */}
      {recentVisitors.length > 0 && (
        <div className="bg-[#1A1A2E] border-b border-[#2A2A3E]">
          <div className="w-full md:max-w-2xl mx-auto px-4 py-4">
            <h3 className="text-sm font-semibold text-[#71717A] uppercase mb-3">
              Recent Visitors
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {recentVisitors.map((visitor) => {
                const visitorName = visitor.username || visitor.first_name || 'User'
                return (
                  <button
                    key={visitor.nullifier_hash}
                    onClick={() => router.push(`/profile/${visitor.nullifier_hash}`)}
                    className="flex flex-col items-center flex-shrink-0"
                  >
                    <UserAvatar
                      avatarUrl={visitor.avatar_url}
                      username={visitorName}
                      size="lg"
                      showStatus={false}
                    />
                    <span className="text-xs text-[var(--text-tertiary)] mt-1 truncate max-w-[60px]">
                      {visitorName}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <div className="w-full md:max-w-2xl mx-auto px-4 py-4">
        <h3 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase mb-3">
          Posts ({posts.length})
        </h3>

        {posts.length === 0 ? (
          <EmptyState
            icon={<Camera className="w-6 h-6" />}
            title="No posts yet"
            description={isOwnProfile ? "Share your first photo or reel!" : "This user hasn't posted anything yet."}
          />
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((post) => {
              // Compute the thumbnail URL based on media type
              let thumbnailSrc = resolveImageUrl(post.image_url)
              if (post.media_type === 'album' && post.media_urls && post.media_urls.length > 0) {
                thumbnailSrc = getS3PublicUrl(post.media_urls[0].key)
              } else if (post.media_type === 'reel' && post.thumbnail_url) {
                thumbnailSrc = getS3PublicUrl(post.thumbnail_url)
              }

              return (
                <Link
                  key={post.id}
                  href={`/feed?scrollTo=${post.id}`}
                  className="aspect-square bg-[var(--obsidian-surface)] overflow-hidden block relative rounded-lg border border-[var(--border)]"
                >
                  <img
                    src={thumbnailSrc}
                    alt={post.caption || 'Post'}
                    className={`w-full h-full object-cover ${
                      post.is_premium && !post.has_access ? 'blur-lg' : ''
                    }`}
                  />
                  {/* Album indicator */}
                  {post.media_type === 'album' && (
                    <div className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded">
                      <Layers className="w-4 h-4" />
                    </div>
                  )}
                  {/* Reel indicator */}
                  {post.media_type === 'reel' && (
                    <div className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded">
                      <Video className="w-4 h-4" />
                    </div>
                  )}
                  {/* Reshare indicator */}
                  {post.original_post_id && (
                    <div className="absolute top-1 left-1 bg-[var(--iris-blue)]/80 text-white p-1 rounded">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                  )}
                  {post.is_premium && !post.has_access && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Lock className="w-8 h-8 text-[var(--retina-gold)]" />
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
      </AppBackground>

      {/* Report User Modal */}
      {showReportModal && user && (
        <ReportModal
          targetId={profileId}
          targetType="user"
          targetName={user.username || user.first_name || undefined}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => setShowReportModal(false)}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Bottom padding for nav */}
      <div className="h-14" />
    </div>
  )
}
