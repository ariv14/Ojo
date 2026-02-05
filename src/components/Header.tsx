'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface HeaderProps {
  showBackButton?: boolean
  onBack?: () => void
  rightContent?: ReactNode
  isFeedPage?: boolean
  title?: string
}

export default function Header({ showBackButton = false, onBack, rightContent, isFeedPage = false, title }: HeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.push('/feed')
    }
  }

  const handleLogoClick = () => {
    if (!isFeedPage) {
      router.push('/feed')
    }
  }

  return (
    <header className="sticky top-0 left-0 right-0 z-40 bg-[var(--obsidian)] shadow-lg border-b border-[var(--border)]">
      <div className="relative z-10 w-full md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="shrink-0 -ml-1.5 p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--sclera-white)] bg-[var(--obsidian-elevated)] hover:bg-[var(--obsidian-surface)] active:scale-92 border border-[var(--border)] transition-all duration-150"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {title ? (
            <h1 className="text-base font-semibold tracking-tight truncate text-[var(--sclera-white)]">{title}</h1>
          ) : isFeedPage ? (
            <div className="flex items-center">
              <span className="text-2xl font-black tracking-tight text-[#00D4FF]">OJO</span>
            </div>
          ) : (
            <button onClick={handleLogoClick} className="flex items-center">
              <span className="text-2xl font-black tracking-tight text-[#00D4FF]">OJO</span>
            </button>
          )}
        </div>
        {rightContent && (
          <div className="flex items-center gap-2 shrink-0">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  )
}
