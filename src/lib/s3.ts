import { S3Client } from '@aws-sdk/client-s3'

// R2 configuration from environment variables
export const s3Config = {
  bucket: process.env.R2_BUCKET || 'ojo-media',
  endpoint: process.env.R2_ENDPOINT || '',
  publicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '',
}

// Create S3-compatible client for Cloudflare R2 (server-side only)
export function getS3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: s3Config.endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  })
}

// Generate public URL from R2 key
export function getS3PublicUrl(key: string): string {
  if (!s3Config.publicUrl) {
    console.error('NEXT_PUBLIC_R2_PUBLIC_URL is not configured')
    return ''
  }
  return `${s3Config.publicUrl}/${key}`
}

// Generate consistent S3 key pattern for post media
export function generateS3Key(
  userId: string,
  postId: string,
  filename: string,
  index: number
): string {
  // Extract file extension
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
  // Clean filename to remove any path components
  const cleanExt = ext.replace(/[^a-z0-9]/gi, '')

  return `posts/${userId}/${postId}/media_${index}.${cleanExt}`
}

// Generate S3 key for reel thumbnail
export function generateThumbnailKey(userId: string, postId: string): string {
  return `posts/${userId}/${postId}/thumbnail.jpg`
}

// Check if a string is a legacy Supabase URL (starts with http)
export function isLegacySupabaseUrl(value: string | undefined | null): boolean {
  if (!value) return false
  return value.startsWith('http')
}

// Resolve image_url or avatar_url to display URL
// Legacy Supabase URLs are returned as-is, R2 keys are converted to full URLs
export function resolveImageUrl(imageUrl: string | undefined | null): string {
  if (!imageUrl) return ''
  if (isLegacySupabaseUrl(imageUrl)) return imageUrl
  return getS3PublicUrl(imageUrl)
}

// Generate S3 key for avatar upload
export function generateAvatarKey(userId: string): string {
  return `avatars/${userId}/${Date.now()}.jpg`
}
