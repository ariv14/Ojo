'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { getPlatformInfo, getVideoMimeType } from '@/utils/platform'
import { validateStreamForRecording, StreamValidation } from '@/utils/audioMerger'

export interface RecordingDiagnostics {
  mimeType: string
  hasVideo: boolean
  hasAudio: boolean
  blobSize: number
  durationMs: number
  platform: {
    isIOS: boolean
    isAndroid: boolean
    isWebView: boolean
  }
  recorderType: string
}

interface UseMediaStreamRecorderReturn {
  start: () => void
  stop: () => Promise<Blob | null>
  recordedBlob: Blob | null
  isRecording: boolean
  isSupported: boolean
  error: string | null
  diagnostics: RecordingDiagnostics | null
  streamValidation: StreamValidation | null
}

// MSR library type (no official TypeScript types)
interface MSRInstance {
  start: (timeSlice?: number) => void
  stop: () => void
  ondataavailable: (blob: Blob) => void
  onstop: () => void
  mimeType: string
  blobs?: Blob[]
}

type MSRConstructor = new (stream: MediaStream) => MSRInstance

/**
 * MediaStreamRecorder (MSR) based recording hook
 * Lightweight alternative with cross-browser compatibility
 */
export function useMediaStreamRecorder(stream: MediaStream | null): UseMediaStreamRecorderReturn {
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<RecordingDiagnostics | null>(null)
  const [streamValidation, setStreamValidation] = useState<StreamValidation | null>(null)
  const [MSR, setMSR] = useState<MSRConstructor | null>(null)

  const recorderRef = useRef<MSRInstance | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const stopResolveRef = useRef<((blob: Blob | null) => void) | null>(null)
  const startTimeRef = useRef<number>(0)

  // Load MSR dynamically on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('msr').then((module) => {
        // MSR uses CommonJS export
        const MediaStreamRecorder = module.default
        setMSR(() => MediaStreamRecorder as unknown as MSRConstructor)
        console.log('[MSR] Library loaded successfully')
      }).catch((err) => {
        console.error('[MSR] Failed to load library:', err)
        setError('Failed to load recording library')
      })
    }
  }, [])

  // MSR is supported once loaded
  const isSupported = typeof window !== 'undefined' && MSR !== null

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        try {
          recorderRef.current.stop()
        } catch (e) {
          console.warn('[MSR] Error stopping recorder:', e)
        }
        recorderRef.current = null
      }
    }
  }, [])

  const start = useCallback(() => {
    if (!stream) {
      setError('No media stream available')
      return
    }

    if (!MSR) {
      setError('Recording library not loaded yet')
      return
    }

    // Validate stream before starting
    const validation = validateStreamForRecording(stream)
    setStreamValidation(validation)

    if (!validation.valid) {
      setError(`Stream not ready: ${validation.errors.join(', ')}`)
      return
    }

    if (!validation.audioTrackActive) {
      console.warn('[MSR] Recording will have no audio - audio track not active')
    }

    try {
      chunksRef.current = []
      setRecordedBlob(null)
      setError(null)
      setDiagnostics(null)
      startTimeRef.current = Date.now()

      const platform = getPlatformInfo()
      const mimeType = platform.needsMP4 ? 'video/mp4' : 'video/webm'

      console.log('[MSR] Starting recording', {
        platform: platform.isIOS ? 'iOS' : platform.isAndroid ? 'Android' : 'Other',
        isWebView: platform.isWebView,
        mimeType,
        hasAudio: validation.audioTrackActive,
        hasVideo: validation.videoTrackActive,
      })

      const recorder = new MSR(stream)
      recorder.mimeType = mimeType

      recorder.ondataavailable = (blob: Blob) => {
        console.log('[MSR] Data chunk:', blob.size, 'bytes')
        chunksRef.current.push(blob)
      }

      recorder.onstop = () => {
        const durationMs = Date.now() - startTimeRef.current

        // Combine all chunks into final blob
        const finalMimeType = getVideoMimeType(mimeType, platform)
        const blob = new Blob(chunksRef.current, { type: finalMimeType })

        if (blob.size === 0) {
          console.error('[MSR] Recording produced empty blob')
          setError('Recording failed - no data captured')
          setIsRecording(false)
          if (stopResolveRef.current) {
            stopResolveRef.current(null)
            stopResolveRef.current = null
          }
          return
        }

        const diag: RecordingDiagnostics = {
          mimeType: finalMimeType,
          hasVideo: stream.getVideoTracks().length > 0,
          hasAudio: stream.getAudioTracks().some(t => t.readyState === 'live' && t.enabled),
          blobSize: blob.size,
          durationMs,
          platform: {
            isIOS: platform.isIOS,
            isAndroid: platform.isAndroid,
            isWebView: platform.isWebView,
          },
          recorderType: 'MediaStreamRecorder',
        }

        console.log('[MSR] Recording complete:', diag)
        setDiagnostics(diag)
        setRecordedBlob(blob)
        setIsRecording(false)

        if (stopResolveRef.current) {
          stopResolveRef.current(blob)
          stopResolveRef.current = null
        }
      }

      recorderRef.current = recorder
      recorder.start(100) // 100ms time slices
      setIsRecording(true)

      console.log('[MSR] Recording started successfully')
    } catch (err) {
      console.error('[MSR] Failed to start recording:', err)
      setError('Failed to start recording')
    }
  }, [stream, MSR])

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!recorderRef.current) {
        console.warn('[MSR] No recorder to stop')
        resolve(recordedBlob)
        return
      }

      stopResolveRef.current = resolve

      try {
        recorderRef.current.stop()
      } catch (err) {
        console.error('[MSR] Error stopping recording:', err)
        setError('Failed to stop recording')
        setIsRecording(false)
        resolve(null)
      }
    })
  }, [recordedBlob])

  return {
    start,
    stop,
    recordedBlob,
    isRecording,
    isSupported,
    error,
    diagnostics,
    streamValidation,
  }
}
