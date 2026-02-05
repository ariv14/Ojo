import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

const cardVariants = {
  default: 'bg-[#1A1A2E] border border-[#2A2A3E] shadow-sm',
  elevated: 'bg-[#1A1A2E] border border-[#2A2A3E] shadow-md',
  interactive: 'bg-[#1A1A2E] border border-[#2A2A3E] shadow-sm cursor-pointer hover:bg-[#12121A] transition-colors',
  featured: 'bg-[#1A1A2E] border border-[#00D4FF]/20 shadow-sm',
  glassDark: 'bg-[#1A1A2E] border border-[#2A2A3E]',
  glassElevated: 'bg-[#1A1A2E] border border-[#2A2A3E] shadow-md',
  elevatedDark: 'bg-[#1A1A2E] border border-[#2A2A3E] shadow-sm',
  premium: 'bg-[#1A1A2E] border border-[#FFD700]/30',
  oro: 'bg-[#1A1A2E] border border-[#2A2A3E] shadow-sm',
  oroWarm: 'bg-[#12121A] border border-[#2A2A3E] shadow-sm',
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl',
          cardVariants[variant],
          paddingMap[padding],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Card.displayName = 'Card'
export default Card
