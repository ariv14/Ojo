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
    <header className="sticky top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="relative z-10 w-full md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="shrink-0 -ml-1.5 p-2 rounded-full text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 active:scale-92 border-0 transition-all duration-150"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {title ? (
            <h1 className="text-base font-semibold tracking-tight truncate text-gray-900">{title}</h1>
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
