import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      <div className="w-14 h-14 rounded-full bg-[#12121A] border border-[#2A2A3E] flex items-center justify-center text-[#00D4FF] mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[#F8F9FA] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#A1A1AA] max-w-xs mb-4">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
