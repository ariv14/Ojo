import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  error?: string
  helperText?: string
  variant?: 'default' | 'dark'
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, error, helperText, variant = 'dark', ...props }, ref) => {
    const isDark = variant === 'dark'

    return (
      <div className="w-full">
        <div className="relative">
          {icon && (
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2",
              isDark ? "text-[var(--text-tertiary)]" : "text-gray-400"
            )}>
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-4 py-2.5 border rounded-lg text-sm transition-all duration-150 outline-none',
              isDark ? [
                'bg-[var(--obsidian-elevated)] border-[var(--border)] text-[var(--sclera-white)]',
                'focus:ring-2 focus:ring-[var(--iris-blue)]/30 focus:border-[var(--iris-blue)]',
                'placeholder:text-[var(--text-tertiary)]',
              ] : [
                'bg-white border-gray-200 text-gray-900',
                'focus:ring-2 focus:ring-[var(--iris-blue)] focus:border-[var(--iris-blue-dark)] focus:bg-cyan-50/30',
                'placeholder:text-gray-400',
              ],
              icon && 'pl-10',
              error && 'border-red-400 focus:ring-red-500/30',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-[var(--error)]">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-[var(--text-tertiary)]">{helperText}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  helperText?: string
  variant?: 'default' | 'dark'
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, variant = 'dark', ...props }, ref) => {
    const isDark = variant === 'dark'

    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 border rounded-lg text-sm transition-all duration-150 outline-none resize-none',
            isDark ? [
              'bg-[var(--obsidian-elevated)] border-[var(--border)] text-[var(--sclera-white)]',
              'focus:ring-2 focus:ring-[var(--iris-blue)]/30 focus:border-[var(--iris-blue)]',
              'placeholder:text-[var(--text-tertiary)]',
            ] : [
              'bg-white border-gray-200 text-gray-900',
              'focus:ring-2 focus:ring-[var(--iris-blue)] focus:border-[var(--iris-blue-dark)] focus:bg-cyan-50/30',
              'placeholder:text-gray-400',
            ],
            error && 'border-red-400 focus:ring-red-500/30',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-[var(--error)]">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-[var(--text-tertiary)]">{helperText}</p>}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'

export { Input, Textarea }
export default Input
