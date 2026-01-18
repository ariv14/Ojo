'use client'

interface UserAvatarProps {
  avatarUrl?: string | null
  firstName?: string | null
  lastSeenAt?: string | null
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
}

export default function UserAvatar({
  avatarUrl,
  firstName,
  lastSeenAt,
  size = 'md',
  showStatus = true,
}: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
  }

  const statusSizeClasses = {
    sm: 'w-2.5 h-2.5 border',
    md: 'w-3 h-3 border-2',
    lg: 'w-4 h-4 border-2',
  }

  // Online if last seen within 5 minutes
  const isOnline = lastSeenAt
    ? (Date.now() - new Date(lastSeenAt).getTime()) < 5 * 60 * 1000
    : false

  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center font-medium overflow-hidden`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-500">{firstName?.[0] || '?'}</span>
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
