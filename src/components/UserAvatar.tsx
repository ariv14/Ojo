'use client'

import { useState } from 'react'
import { resolveImageUrl } from '@/lib/s3'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  avatarUrl?: string | null
  firstName?: string | null  // Deprecated - use username
  username?: string | null   // Primary display name
  lastSeenAt?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showStatus?: boolean
  ring?: boolean
}

const gradientBackgrounds = [
  'bg-gradient-to-br from-violet-400 to-purple-600',
  'bg-gradient-to-br from-blue-400 to-indigo-600',
  'bg-gradient-to-br from-emerald-400 to-teal-600',
  'bg-gradient-to-br from-amber-400 to-orange-600',
  'bg-gradient-to-br from-rose-400 to-pink-600',
  'bg-gradient-to-br from-cyan-400 to-blue-600',
  'bg-gradient-to-br from-fuchsia-400 to-purple-600',
  'bg-gradient-to-br from-lime-400 to-green-600',
]

function getGradientForLetter(letter: string): string {
  const code = (letter || '?').toUpperCase().charCodeAt(0)
  return gradientBackgrounds[code % gradientBackgrounds.length]
}

export default function UserAvatar({
  avatarUrl,
  firstName,
  username,
  lastSeenAt,
  size = 'md',
  showStatus = true,
  ring = false,
}: UserAvatarProps) {
  // Use username if provided, fall back to firstName for compatibility
  const displayName = username || firstName
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
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

  const letter = displayName?.[0] || '?'

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          sizeClasses[size],
          'rounded-full flex items-center justify-center font-semibold overflow-hidden',
          resolvedAvatarUrl && !imageError ? 'bg-gray-200' : getGradientForLetter(letter),
          ring && 'ring-2 ring-white shadow-[var(--shadow-sm)]',
        )}
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
          <span className="text-white">{letter.toUpperCase()}</span>
        )}
      </div>
      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-white',
            statusSizeClasses[size],
            isOnline ? 'bg-green-500' : 'bg-gray-400',
            isOnline && 'animate-pulse-soft',
          )}
        />
      )}
    </div>
  )
}
