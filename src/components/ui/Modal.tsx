'use client'

import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  showClose?: boolean
  closeOnBackdrop?: boolean
  variant?: 'default' | 'premium'
}

export default function Modal({
  isOpen,
  onClose,
  children,
  className,
  showClose = false,
  closeOnBackdrop = true,
  variant = 'default',
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const isPremium = variant === 'premium'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - solid dark */}
      <div
        className="absolute inset-0 bg-black/80 animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      {/* Content */}
      <div
        className={cn(
          'relative w-full max-w-sm rounded-2xl shadow-lg overflow-hidden animate-slide-up',
          isPremium
            ? 'bg-[#1A1A2E] border border-[#FFD700]/30'
            : 'bg-[#1A1A2E] border border-[#2A2A3E]',
          className,
        )}
      >
        {showClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 text-[#71717A] hover:text-[#F8F9FA] rounded-full hover:bg-[#12121A] transition z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
