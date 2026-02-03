import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

const cardVariants = {
  default: 'bg-white shadow-[var(--shadow-card)]',
  elevated: 'bg-white shadow-[var(--shadow-md)]',
  interactive: 'bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
  featured: 'bg-gradient-to-br from-violet-50 to-white shadow-[var(--shadow-card)] border border-violet-100',
  oro: 'bg-[var(--oro-cream)] shadow-[var(--shadow-oro-card)]',
  oroWarm: 'bg-[var(--oro-cream-warm)] shadow-[var(--shadow-oro-card)]',
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
    const isOro = variant === 'oro' || variant === 'oroWarm'
    return (
      <div
        ref={ref}
        className={cn(
          isOro ? 'rounded-3xl' : 'rounded-xl',
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
