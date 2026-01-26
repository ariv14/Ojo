'use client'

import { useState } from 'react'
import { resolveImageUrl } from '@/lib/s3'

interface UserAvatarProps {
  avatarUrl?: string | null
  firstName?: string | null  // Deprecated - use username
  username?: string | null   // Primary display name
  lastSeenAt?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showStatus?: boolean
}

export default function UserAvatar({
  avatarUrl,
  firstName,
  username,
  lastSeenAt,
  size = 'md',
  showStatus = true,
}: UserAvatarProps) {
  // Use username if provided, fall back to firstName for compatibility
  const displayName = username || firstName
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
  }

  const statusSizeClasses = {
    xs: 'w-2 h-2 border',
    sm: 'w-2.5 h-2.5 border',
    md: 'w-3 h-3 border-2',
    lg: 'w-4 h-4 border-2',
  }

  const [imageError, setImageError] = useState(false)

  // Online if last seen within 5 minutes
  const isOnline = lastSeenAt
    ? (Date.now() - new Date(lastSeenAt).getTime()) < 5 * 60 * 1000
    : false

  // Resolve avatar URL (handles both legacy Supabase URLs and R2 keys)
  const resolvedAvatarUrl = resolveImageUrl(avatarUrl)

  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center font-medium overflow-hidden`}
      >
        {resolvedAvatarUrl && !imageError ? (
          <img
            src={resolvedAvatarUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-gray-500">{displayName?.[0] || '?'}</span>
        )}
      </div>
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 ${statusSizeClasses[size]} rounded-full border-white ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  )
}
