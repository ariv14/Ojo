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

const solidBackgrounds = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-fuchsia-500',
  'bg-lime-500',
]

function getBackgroundForLetter(letter: string): string {
  const code = (letter || '?').toUpperCase().charCodeAt(0)
  return solidBackgrounds[code % solidBackgrounds.length]
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
          resolvedAvatarUrl && !imageError ? 'bg-gray-200' : getBackgroundForLetter(letter),
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
