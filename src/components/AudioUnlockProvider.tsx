'use client'

import { useEffect } from 'react'
import { setupAutoUnlock } from '@/utils/audioUnlock'

/**
 * AudioUnlockProvider - App-level component that sets up automatic audio unlock
 *
 * On iOS, audio playback requires a user gesture to unlock the AudioContext.
 * This provider attaches listeners for common user interactions (touch, click, keydown)
 * and unlocks audio on the first gesture.
 *
 * Usage: Wrap your app with this provider in layout.tsx
 */
export default function AudioUnlockProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const cleanup = setupAutoUnlock()
    return cleanup
  }, [])

  return <>{children}</>
}
