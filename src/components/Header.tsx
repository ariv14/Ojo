'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
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
    <header className="fixed top-0 left-0 right-0 animated-gradient-header text-white z-40">
      <div className="w-full md:max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="text-white/80 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
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
