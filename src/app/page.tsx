'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoginButton from '@/components/LoginButton'
import { getSession, UserSession } from '@/lib/session'

export default function Home() {
  const router = useRouter()
  // Initialize session state synchronously after mount (localStorage is sync)
  const [session, setSession] = useState<UserSession | null | undefined>(undefined)

  useEffect(() => {
    // Session read is synchronous, no loading spinner needed
    setSession(getSession())
  }, [])

  // Only show minimal loading on first render before useEffect runs
  // This prevents flash when localStorage has data
  if (session === undefined) {
    return null // Render nothing during hydration
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold mb-2">Ojo</h1>
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
