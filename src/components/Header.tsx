'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import DoodleLogo from './DoodleLogo'

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
    <header className="fixed top-0 left-0 right-0 animated-gradient-header backdrop-blur-xl text-white z-40">
      {/* Top highlight edge for depth */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent z-10" />
      {/* Bottom border with gradient */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />
      <div className="relative z-10 w-full md:max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="shrink-0 -ml-1.5 p-2 rounded-full text-white/80 hover:text-white bg-white/5 hover:bg-white/15 active:scale-92 border border-white/10 hover:border-white/20 transition-all duration-150"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {title ? (
            <h1 className="text-base font-semibold tracking-tight truncate">{title}</h1>
          ) : isFeedPage ? (
            <div className="flex items-center">
              <DoodleLogo size="md" showTooltipOnTap />
            </div>
          ) : (
            <button onClick={handleLogoClick} className="flex items-center">
              <DoodleLogo size="md" />
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
