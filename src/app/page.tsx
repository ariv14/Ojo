'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Shield, Lock, Coins } from 'lucide-react'
import LoginButton from '@/components/LoginButton'
import { getSession, UserSession } from '@/lib/session'

// Key for storing referral code in localStorage
const REFERRAL_CODE_KEY = 'ojo_referral_code'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  if (session === undefined) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0F] px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-6 flex items-center justify-center relative">
          {/* Ambient glow behind logo */}
          <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-[#00D4FF]/30 to-[#7C4DFF]/30 rounded-full scale-150" />
          <h1
            className="text-7xl font-black tracking-tight relative"
            style={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #7C4DFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(0, 212, 255, 0.5))',
            }}
          >
            OJO
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-xl font-bold mb-10 text-[#00D4FF]">
          Keep an eye on what is real
        </p>

        {/* Login section */}
        <div>
          {session ? (
            <div className="space-y-4">
              <p className="text-[#E4E4E7]">
                Welcome back, {session.username || session.first_name || 'friend'}!
              </p>
              <button
                onClick={() => router.push('/feed')}
                className="bg-[#00D4FF] text-[#0A0A0F] px-8 py-3 rounded-full font-semibold hover:bg-[#0091FF] transition-colors"
              >
                Go to Feed
              </button>
            </div>
          ) : (
            <LoginButton />
          )}
        </div>

        {/* Feature cards */}
        <div className="mt-12 grid grid-cols-3 gap-3">
          <div className="bg-[#1A1A2E] rounded-xl p-4 border border-[#2A2A3E]">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[#00D4FF]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#00D4FF]" />
            </div>
            <h3 className="text-xs font-bold text-[#F8F9FA] mb-1">Verified Humans</h3>
            <p className="text-[10px] leading-tight text-[#71717A]">
              Every user is Orb-verified unique human
            </p>
          </div>
          <div className="bg-[#1A1A2E] rounded-xl p-4 border border-[#2A2A3E]">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[#7C4DFF]/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#7C4DFF]" />
            </div>
            <h3 className="text-xs font-bold text-[#F8F9FA] mb-1">Premium Content</h3>
            <p className="text-[10px] leading-tight text-[#71717A]">
              Unlock exclusive content with WLD
            </p>
          </div>
          <div className="bg-[#1A1A2E] rounded-xl p-4 border border-[#2A2A3E]">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-[#FFD700]" />
            </div>
            <h3 className="text-xs font-bold text-[#F8F9FA] mb-1">WLD Payments</h3>
            <p className="text-[10px] leading-tight text-[#71717A]">
              Send tips and earn from your content
            </p>
          </div>
        </div>

        {/* Legal links footer */}
        <div className="mt-16 pt-6 border-t border-[#2A2A3E]">
          <div className="flex justify-center gap-4 text-sm text-[#71717A]">
            <Link href="/privacy" className="hover:text-[#A1A1AA] transition">
              Privacy Policy
            </Link>
            <span className="text-[#2A2A3E]">|</span>
            <Link href="/terms" className="hover:text-[#A1A1AA] transition">
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
        <div className="w-8 h-8 spinner-iris" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
