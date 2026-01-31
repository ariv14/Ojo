import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-shimmer rounded-md', className)} />
  )
}

export function SkeletonText({ className, lines = 1 }: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  )
}

export function SkeletonCircle({ className, size = 'md' }: SkeletonProps & { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' }
  return <Skeleton className={cn('rounded-full', sizeMap[size], className)} />
}

export function SkeletonPost({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-white rounded-xl p-4 space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <SkeletonCircle size="md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      {/* Image */}
      <Skeleton className="w-full aspect-square rounded-lg" />
      {/* Actions */}
      <div className="flex gap-4">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
      {/* Caption */}
      <SkeletonText lines={2} />
    </div>
  )
}

export function SkeletonUserRow({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-3 p-4', className)}>
      <SkeletonCircle size="md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
  )
}

export function SkeletonChatRow({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3', className)}>
      <SkeletonCircle size="lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-2.5 w-40" />
      </div>
      <Skeleton className="h-3 w-14" />
    </div>
  )
}

export function SkeletonMessage({ className, isMe = false }: SkeletonProps & { isMe?: boolean }) {
  return (
    <div className={cn('flex', isMe ? 'justify-end' : 'justify-start', className)}>
      <Skeleton className={cn('h-10 rounded-2xl', isMe ? 'w-48' : 'w-40')} />
    </div>
  )
}
