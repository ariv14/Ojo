'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Image from 'next/image'

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
    <header className="sticky top-0 left-0 right-0 z-40 bg-black shadow-lg">
      <div className="relative z-10 w-full md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="shrink-0 -ml-1.5 p-2 rounded-full text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 active:scale-92 border-0 transition-all duration-150"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {title ? (
            <h1 className="text-base font-semibold tracking-tight truncate text-white">{title}</h1>
          ) : isFeedPage ? (
            <div className="flex items-center">
              <Image src="/logo.png" alt="OJO" height={32} width={80} className="object-contain brightness-0 invert" />
            </div>
          ) : (
            <button onClick={handleLogoClick} className="flex items-center">
              <Image src="/logo.png" alt="OJO" height={32} width={80} className="object-contain brightness-0 invert" />
            </button>
          )}
        </div>
        {rightContent && (
          <div className="flex items-center gap-2 shrink-0">
            {rightContent}
          </div>
        )}
      </div>
      {/* Accent gradient bar */}
      <div className="h-0.5 bg-gradient-to-r from-[var(--oro-cyan)] via-[var(--oro-purple)] to-[var(--oro-orange)]" />
    </header>
  )
}
