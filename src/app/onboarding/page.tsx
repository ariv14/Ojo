'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Onboarding is no longer needed - users get profile data from World App
// This page now redirects to /feed for any edge cases
function OnboardingRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to feed - onboarding is handled automatically during login
    router.replace('/feed')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Redirecting...</p>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <OnboardingRedirect />
    </Suspense>
  )
}
