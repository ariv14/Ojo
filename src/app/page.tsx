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
    <div className="min-h-screen flex flex-col items-center justify-center bg-oro-waves px-4 relative overflow-hidden">
      {/* Vibrant background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[var(--oro-cyan)]/30 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[var(--oro-orange)]/20 to-transparent blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[var(--oro-purple)]/20 to-transparent blur-3xl" />
      </div>

      <div className="w-full max-w-md text-center animate-fade-in-up relative z-10">
        <h1 className="mb-2 flex items-center justify-center animate-subtle-float">
          <DoodleLogo size="lg" />
        </h1>
        <p className="text-xl font-bold mb-8 text-gradient-oro-animated">
          Keep an eye on what is real
        </p>

        {session ? (
          <div className="space-y-4">
            <p className="text-gray-700">
              Welcome back, {session.username || session.first_name || 'friend'}!
            </p>
            <button
              onClick={() => router.push('/feed')}
              className="btn-brand px-6 py-3 rounded-full font-medium"
            >
              Go to Feed
            </button>
          </div>
        ) : (
          <LoginButton />
        )}

        {/* Feature highlight cards - ORO cream style */}
        <div className="mt-10 grid grid-cols-3 gap-3">
          <div className="bg-[var(--oro-cream)] backdrop-blur-md rounded-3xl p-4 shadow-[var(--shadow-oro-card)] hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 animate-bounce-in" style={{ animationDelay: '0ms' }}>
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-[var(--oro-cyan)]/20 to-[var(--oro-cyan)]/5 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[var(--oro-turquoise)]" />
            </div>
            <h3 className="text-xs font-bold text-gray-800 mb-1">Verified Humans</h3>
            <p className="text-[10px] leading-tight text-gray-500">
              Every user is Orb-verified unique human
            </p>
          </div>
          <div className="bg-[var(--oro-cream)] backdrop-blur-md rounded-3xl p-4 shadow-[var(--shadow-oro-card)] hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 animate-bounce-in" style={{ animationDelay: '100ms' }}>
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-[var(--oro-purple)]/20 to-[var(--oro-purple)]/5 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[var(--oro-purple)]" />
            </div>
            <h3 className="text-xs font-bold text-gray-800 mb-1">Premium Content</h3>
            <p className="text-[10px] leading-tight text-gray-500">
              Unlock exclusive content with WLD
            </p>
          </div>
          <div className="bg-[var(--oro-cream)] backdrop-blur-md rounded-3xl p-4 shadow-[var(--shadow-oro-card)] hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 animate-bounce-in" style={{ animationDelay: '200ms' }}>
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-[var(--oro-orange)]/20 to-[var(--oro-orange)]/5 flex items-center justify-center">
              <Coins className="w-5 h-5 text-[var(--oro-orange)]" />
            </div>
            <h3 className="text-xs font-bold text-gray-800 mb-1">WLD Payments</h3>
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
