'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type RecorderState = 'idle' | 'requesting' | 'ready' | 'recording' | 'stopped' | 'error'

export interface UseMediaRecorderOptions {
  maxDuration?: number // in seconds, default 10
  onProgress?: (elapsed: number) => void
}

export interface UseMediaRecorderResult {
  state: RecorderState
  error: string | null
  hasAudio: boolean
  elapsed: number
  videoBlob: Blob | null
  stream: MediaStream | null
  requestPermissions: () => Promise<boolean>
  startRecording: () => void
  stopRecording: () => void
  reset: () => void
}

/**
 * Gets the best supported MIME type for MediaRecorder
 * iOS Safari prefers mp4, Android/Chrome prefers webm
 */
function getMimeType(): string {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream

  if (isIOS) {
    // iOS Safari supports mp4
    return 'video/mp4'
  }

  // Try preferred codecs in order
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  // Fallback
  return 'video/mp4'
}

/**
 * Custom hook for video recording with MediaRecorder API
 * Handles platform differences and MiniKit microphone permissions
 */
export function useMediaRecorder({
  maxDuration = 10,
  onProgress,
}: UseMediaRecorderOptions = {}): UseMediaRecorderResult {
  const [state, setState] = useState<RecorderState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [hasAudio, setHasAudio] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTracks()
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const stopAllTracks = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  /**
   * Request camera and microphone permissions
   * Following MiniKit documentation for World App
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setState('requesting')
    setError(null)

    try {
      // Request both video and audio per MiniKit docs
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera by default
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      })

      setStream(mediaStream)
      setHasAudio(true)
      setState('ready')
      return true
    } catch (err) {
      const error = err as Error & { name?: string }
      console.error('getUserMedia error:', error)

      // Handle specific error types per MiniKit docs
      if (error.name === 'NotAllowedError') {
        // Check for World App specific errors in message
        if (error.message?.includes('world_app_permission_not_enabled')) {
          setError('Microphone disabled in World App. Enable in device settings.')
        } else if (error.message?.includes('permission_disabled')) {
          setError('Permissions disabled. Please enable camera and microphone in settings.')
        } else {
          setError('Camera access denied. Please allow camera and microphone access.')
        }
      } else if (error.name === 'NotFoundError') {
        setError('No camera found on this device.')
      } else if (error.name === 'NotReadableError') {
        setError('Camera is in use by another app.')
      } else if (error.name === 'OverconstrainedError') {
        // Try again with basic constraints
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          })
          setStream(basicStream)
          setHasAudio(true)
          setState('ready')
          return true
        } catch {
          setError('Camera not compatible. Please try again.')
        }
      } else {
        setError('Failed to access camera. Please try again.')
      }

      // Try video-only as fallback
      try {
        const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
          },
        })
        setStream(videoOnlyStream)
        setHasAudio(false)
        setState('ready')
        console.log('Falling back to video-only mode')
        return true
      } catch {
        setState('error')
        return false
      }
    }
  }, [])

  /**
   * Start recording video
   */
  const startRecording = useCallback(() => {
    if (!stream || state !== 'ready') {
      console.warn('Cannot start recording: stream not ready')
      return
    }

    chunksRef.current = []
    setElapsed(0)

    try {
      const mimeType = getMimeType()
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      })

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setVideoBlob(blob)
        setState('stopped')

        // Clear timer
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
      }

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setError('Recording failed. Please try again.')
        setState('error')
      }

      mediaRecorderRef.current = recorder
      recorder.start(100) // Collect data every 100ms
      setState('recording')
      startTimeRef.current = Date.now()

      // Update elapsed time using requestAnimationFrame for smooth progress
      const updateElapsed = () => {
        const currentElapsed = (Date.now() - startTimeRef.current) / 1000
        setElapsed(currentElapsed)
        onProgress?.(currentElapsed)

        if (currentElapsed < maxDuration) {
          animationFrameRef.current = requestAnimationFrame(updateElapsed)
        }
      }
      animationFrameRef.current = requestAnimationFrame(updateElapsed)

      // Auto-stop at max duration
      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, maxDuration * 1000)

    } catch (err) {
      console.error('Failed to create MediaRecorder:', err)
      setError('Recording not supported on this device.')
      setState('error')
    }
  }, [stream, state, maxDuration, onProgress])

  /**
   * Stop recording manually
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    stopAllTracks()
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    mediaRecorderRef.current = null
    chunksRef.current = []

    setState('idle')
    setError(null)
    setHasAudio(false)
    setElapsed(0)
    setVideoBlob(null)
    setStream(null)
  }, [stopAllTracks])

  return {
    state,
    error,
    hasAudio,
    elapsed,
    videoBlob,
    stream,
    requestPermissions,
    startRecording,
    stopRecording,
    reset,
  }
}
