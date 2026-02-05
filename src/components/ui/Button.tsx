'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const variants = {
  primary: 'bg-[#00D4FF] text-[#0A0A0F] hover:bg-[#0091FF] active:scale-[0.98]',
  secondary: 'bg-[#1A1A2E] text-[#F8F9FA] hover:bg-[#12121A] border border-[#2A2A3E] active:scale-[0.98]',
  outline: 'bg-transparent text-[#F8F9FA] border border-[#2A2A3E] hover:border-[#00D4FF] hover:text-[#00D4FF] active:scale-[0.98]',
  ghost: 'bg-transparent text-[#00D4FF] hover:bg-[#00D4FF]/10 active:scale-[0.98]',
  danger: 'bg-[#FF5252] text-white hover:bg-red-600 active:scale-[0.98]',
  iris: 'bg-[#00D4FF] text-[#0A0A0F] hover:bg-[#0091FF] active:scale-[0.98]',
  gold: 'bg-[#FFD700] text-[#0A0A0F] hover:bg-[#E6C200] active:scale-[0.98]',
  ghostDark: 'bg-transparent text-[#00D4FF] hover:bg-[#00D4FF]/10 active:scale-[0.98]',
  outlineDark: 'bg-transparent text-[#F8F9FA] border border-[#2A2A3E] hover:border-[#00D4FF] hover:text-[#00D4FF] active:scale-[0.98]',
  brand: 'bg-[#00D4FF] text-[#0A0A0F] hover:bg-[#0091FF] active:scale-[0.98]',
  accent: 'bg-[#00D4FF] text-[#0A0A0F] hover:bg-[#0091FF] active:scale-[0.98]',
  oro: 'bg-[#00D4FF] text-[#0A0A0F] hover:bg-[#0091FF] active:scale-[0.98]',
  oroCyan: 'bg-[#00D4FF] text-[#0A0A0F] hover:bg-[#0091FF] active:scale-[0.98]',
}

const sizes = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F] disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'
export default Button
