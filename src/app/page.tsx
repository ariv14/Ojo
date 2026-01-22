'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LoginButton from '@/components/LoginButton'
import { getSession, UserSession } from '@/lib/session'

// Key for storing referral code in localStorage
const REFERRAL_CODE_KEY = 'ojo_referral_code'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Initialize session state synchronously after mount (localStorage is sync)
  const [session, setSession] = useState<UserSession | null | undefined>(undefined)

  useEffect(() => {
    // Check for referral code in URL and store it
    const refCode = searchParams.get('ref')
    if (refCode) {
      localStorage.setItem(REFERRAL_CODE_KEY, refCode.toUpperCase())
    }

    const userSession = getSession()
    if (userSession) {
      router.push('/feed')
    } else {
      setSession(null)
    }
  }, [router, searchParams])

  // Only show minimal loading on first render before useEffect runs
  // This prevents flash when localStorage has data
  if (session === undefined) {
    return null // Render nothing during hydration
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold mb-2 flex items-center justify-center">
          <span className="relative">
            O
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-2.5 h-2.5 bg-current rounded-full"></span>
            </span>
          </span>
          <span>J</span>
          <span className="relative">
            O
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-2.5 h-2.5 bg-current rounded-full"></span>
            </span>
          </span>
        </h1>
        <p className="text-gray-500 mb-8">
          Keep an eye on what is real
        </p>

        {session ? (
          <div className="space-y-4">
            <p className="text-gray-700">
              Welcome back, {session.first_name}!
            </p>
            <button
              onClick={() => router.push('/feed')}
              className="bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition"
            >
              Go to Feed
            </button>
          </div>
        ) : (
          <LoginButton />
        )}
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">Loading...</p></div>}>
      <HomeContent />
    </Suspense>
  )
}
