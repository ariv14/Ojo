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
}

export default function Header({ showBackButton = false, onBack, rightContent, isFeedPage = false }: HeaderProps) {
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
    <header className="fixed top-0 left-0 right-0 animated-gradient-header backdrop-blur-xl text-white z-40 border-b border-white/10">
      <div className="w-full md:max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="-ml-1.5 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {isFeedPage ? (
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
          <div className="flex items-center gap-3">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  )
}
