'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Shield, Lock, Coins } from 'lucide-react'
import LoginButton from '@/components/LoginButton'
import DoodleLogo from '@/components/DoodleLogo'
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-md text-center animate-fade-in-up">
        <h1 className="mb-2 flex items-center justify-center">
          <DoodleLogo size="lg" />
        </h1>
        <p className="text-lg font-semibold mb-8 bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
          Keep an eye on what is real
        </p>

        {session ? (
          <div className="space-y-4">
            <p className="text-gray-700">
              Welcome back, {session.username || session.first_name || 'friend'}!
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

        {/* Feature highlight cards */}
        <div className="mt-10 grid grid-cols-3 gap-3">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm">
            <Shield className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
            <h3 className="text-xs font-semibold text-gray-800 mb-1">Verified Humans</h3>
            <p className="text-[10px] leading-tight text-gray-500">
              Every user is Orb-verified unique human
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm">
            <Lock className="w-6 h-6 mx-auto mb-2 text-fuchsia-600" />
            <h3 className="text-xs font-semibold text-gray-800 mb-1">Premium Content</h3>
            <p className="text-[10px] leading-tight text-gray-500">
              Unlock exclusive content with WLD
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm">
            <Coins className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <h3 className="text-xs font-semibold text-gray-800 mb-1">WLD Payments</h3>
            <p className="text-[10px] leading-tight text-gray-500">
              Send tips and earn from your content
            </p>
          </div>
        </div>

        {/* Legal links footer */}
        <div className="mt-16 pt-6 border-t border-gray-200/60">
          <div className="flex justify-center gap-4 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600 transition">
              Privacy Policy
            </Link>
            <span>|</span>
            <Link href="/terms" className="hover:text-gray-600 transition">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-indigo-50"><p className="text-gray-500">Loading...</p></div>}>
      <HomeContent />
    </Suspense>
  )
}
