/**
 * iOS AudioContext unlock pattern
 * iOS requires a user gesture to enable audio playback
 * This module provides utilities to unlock audio on first user interaction
 */

// Singleton AudioContext for the app
let audioContext: AudioContext | null = null
let isUnlocked = false

/**
 * Gets or creates the shared AudioContext
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') {
    return null
  }

  if (!audioContext) {
    try {
      audioContext = new AudioContext()
    } catch (error) {
      console.warn('Failed to create AudioContext:', error)
      return null
    }
  }

  return audioContext
}

/**
 * Unlocks audio playback on iOS
 * Must be called from a user gesture event handler
 * @returns Promise that resolves when audio is unlocked
 */
export async function unlockAudio(): Promise<boolean> {
  if (isUnlocked) {
    return true
  }

  const ctx = getAudioContext()
  if (!ctx) {
    return false
  }

  try {
    // Resume suspended AudioContext
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    // Play a silent buffer to fully unlock audio
    const buffer = ctx.createBuffer(1, 1, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)

    isUnlocked = true
    console.log('Audio unlocked successfully')
    return true
  } catch (error) {
    console.warn('Failed to unlock audio:', error)
    return false
  }
}

/**
 * Safely unmutes a video element on iOS
 * Combines AudioContext unlock with video unmute
 * Must be called from a user gesture event handler
 * @param video The video element to unmute
 * @returns Promise that resolves to true if unmute succeeded
 */
export async function safeUnmuteVideo(
  video: HTMLVideoElement | null
): Promise<boolean> {
  if (!video) {
    return false
  }

  try {
    // First unlock the AudioContext
    await unlockAudio()

    // Then unmute the video
    video.muted = false

    // Try to play if paused (iOS may require this)
    if (video.paused) {
      try {
        await video.play()
      } catch {
        // Play may fail if not in viewport, that's ok
      }
    }

    return !video.muted
  } catch (error) {
    console.warn('Failed to unmute video:', error)
    return false
  }
}

/**
 * Sets up automatic audio unlock on first user gesture
 * Attaches listeners for common user interaction events
 * @returns Cleanup function to remove listeners
 */
export function setupAutoUnlock(): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const events = ['touchstart', 'touchend', 'click', 'keydown'] as const

  const handleUserGesture = () => {
    unlockAudio().then((unlocked) => {
      if (unlocked) {
        // Remove listeners once unlocked
        events.forEach((event) => {
          document.removeEventListener(event, handleUserGesture, true)
        })
      }
    })
  }

  // Add listeners with capture to catch events early
  events.forEach((event) => {
    document.addEventListener(event, handleUserGesture, {
      capture: true,
      passive: true,
    })
  })

  // Return cleanup function
  return () => {
    events.forEach((event) => {
      document.removeEventListener(event, handleUserGesture, true)
    })
  }
}

/**
 * Checks if audio is currently unlocked
 */
export function isAudioUnlocked(): boolean {
  return isUnlocked
}

/**
 * Gets the current AudioContext state
 */
export function getAudioContextState(): AudioContextState | null {
  const ctx = getAudioContext()
  return ctx?.state ?? null
}
