import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

const cardVariants = {
  default: 'bg-white border border-gray-100 shadow-[var(--shadow-xs)]',
  elevated: 'bg-white shadow-[var(--shadow-md)]',
  interactive: 'bg-white border border-gray-100 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] transition-shadow duration-200 cursor-pointer',
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
