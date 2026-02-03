import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-all duration-150 outline-none',
              'focus:ring-2 focus:ring-[var(--oro-cyan)] focus:border-[var(--oro-cyan-light)] focus:bg-cyan-50/30',
              'placeholder:text-gray-400',
              icon && 'pl-10',
              error ? 'border-red-400 focus:ring-red-500' : 'border-gray-200',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-gray-400">{helperText}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  helperText?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-all duration-150 outline-none resize-none',
            'focus:ring-2 focus:ring-[var(--oro-cyan)] focus:border-[var(--oro-cyan-light)] focus:bg-cyan-50/30',
            'placeholder:text-gray-400',
            error ? 'border-red-400 focus:ring-red-500' : 'border-gray-200',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-gray-400">{helperText}</p>}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'

export { Input, Textarea }
export default Input
