'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/session'
import Header from '@/components/Header'
import BackgroundLayout from '@/components/rewards/BackgroundLayout'
import FloatingPillNav, { RewardsTab } from '@/components/rewards/FloatingPillNav'
import ClaimTab from '@/components/rewards/ClaimTab'
import ShareTab from '@/components/rewards/ShareTab'
import AboutTab from '@/components/rewards/AboutTab'
import { Gift } from 'lucide-react'

export default function RewardsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<RewardsTab>('claim')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const session = getSession()
    if (!session?.nullifier_hash) {
      router.push('/')
      return
    }
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--oro-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'claim':
        return <ClaimTab />
      case 'share':
        return <ShareTab />
      case 'about':
        return <AboutTab />
      default:
        return <ClaimTab />
    }
  }

  return (
    <div className="min-h-screen">
      <Header
        showBackButton
        onBack={() => router.push('/feed')}
        title="Rewards"
        rightContent={
          <button
            onClick={() => setActiveTab('claim')}
            className="header-icon-btn"
          >
            <Gift className="w-5 h-5" />
          </button>
        }
      />

      <BackgroundLayout>
        <FloatingPillNav activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="pb-20">
          {renderTab()}
        </main>
      </BackgroundLayout>
    </div>
  )
}
