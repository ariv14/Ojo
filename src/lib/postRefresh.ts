import { supabase } from '@/lib/supabase'

interface MediaUrl {
  key: string
  type: string
}

export interface FreshPostData {
  id: string
  image_url?: string
  media_urls?: MediaUrl[]
  thumbnail_url?: string
}

/**
 * Add cache-busting parameter to a URL.
 * For Supabase storage URLs, the URL doesn't change in the database,
 * so we need to append a timestamp to force a fresh fetch.
 */
function addCacheBuster(url: string | undefined | null): string | undefined {
  if (!url) return undefined
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_t=${Date.now()}`
}

/**
 * Directly query Supabase for fresh post URLs.
 * This is the first-tier refresh approach.
 */
export async function fetchFreshPostUrls(postId: string): Promise<FreshPostData | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, image_url, media_urls, thumbnail_url')
    .eq('id', postId)
    .single()

  if (error || !data) {
    console.error('Error fetching fresh post URLs:', error)
    return null
  }

  return {
    id: data.id,
    // Add cache-busting to Supabase storage URLs (image_url stores full URL)
    image_url: addCacheBuster(data.image_url),
    media_urls: data.media_urls as MediaUrl[] | undefined,
    thumbnail_url: data.thumbnail_url,
  }
}

/**
 * Fetch post data via the user's profile (same query profile page uses).
 * This is the fallback approach that mimics navigating to profile and back.
 * Always works because it forces a fresh query through a different path.
 */
export async function fetchPostViaProfile(userId: string, postId: string): Promise<FreshPostData | null> {
  // Query all posts from this user (like the profile page does)
  // This forces a fresh database query that always returns current data
  const { data: userPosts, error } = await supabase
    .from('posts')
    .select('id, image_url, media_urls, thumbnail_url')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !userPosts) {
    console.error('Error fetching posts via profile:', error)
    return null
  }

  // Find the specific post we need
  const post = userPosts.find(p => p.id === postId)

  if (!post) {
    console.error('Post not found in user profile data')
    return null
  }

  return {
    id: post.id,
    // Add cache-busting to Supabase storage URLs (image_url stores full URL)
    image_url: addCacheBuster(post.image_url),
    media_urls: post.media_urls as MediaUrl[] | undefined,
    thumbnail_url: post.thumbnail_url,
  }
}
