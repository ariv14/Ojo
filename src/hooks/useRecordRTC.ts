'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type RecordRTCClass from 'recordrtc'
import { getPlatformInfo, getVideoMimeType } from '@/utils/platform'
import { validateStreamForRecording, StreamValidation } from '@/utils/audioMerger'

// Type for dynamically imported RecordRTC
type RecordRTCType = typeof RecordRTCClass

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

interface UseRecordRTCReturn {
  start: () => void
  stop: () => Promise<Blob | null>
  recordedBlob: Blob | null
  isRecording: boolean
  isSupported: boolean
  error: string | null
  diagnostics: RecordingDiagnostics | null
  streamValidation: StreamValidation | null
}

/**
 * RecordRTC-based recording hook
 * More robust than native MediaRecorder, with better cross-browser and WebView support
 */
export function useRecordRTC(stream: MediaStream | null): UseRecordRTCReturn {
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<RecordingDiagnostics | null>(null)
  const [streamValidation, setStreamValidation] = useState<StreamValidation | null>(null)
  const [RecordRTC, setRecordRTC] = useState<RecordRTCType | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recorderRef = useRef<any>(null)
  const stopResolveRef = useRef<((blob: Blob | null) => void) | null>(null)
  const startTimeRef = useRef<number>(0)

  // Load RecordRTC dynamically on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('recordrtc').then((module) => {
        setRecordRTC(() => module.default)
        console.log('[RecordRTC] Library loaded successfully')
      }).catch((err) => {
        console.error('[RecordRTC] Failed to load library:', err)
        setError('Failed to load recording library')
      })
    }
  }, [])

  // RecordRTC is always "supported" once loaded
  const isSupported = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && RecordRTC !== null

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        try {
          recorderRef.current.destroy()
        } catch (e) {
          console.warn('[RecordRTC] Error destroying recorder:', e)
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

    if (!RecordRTC) {
      setError('Recording library not loaded yet')
      return
    }

    if (!isSupported) {
      setError('Recording is not supported in this browser')
      return
    }

    // Validate stream before starting
    const validation = validateStreamForRecording(stream)
    setStreamValidation(validation)

    if (!validation.valid) {
      setError(`Stream not ready: ${validation.errors.join(', ')}`)
      return
    }

    // Log audio status for debugging
    if (!validation.audioTrackActive) {
      console.warn('[RecordRTC] Recording will have no audio - audio track not active')
    }

    try {
      setRecordedBlob(null)
      setError(null)
      setDiagnostics(null)
      startTimeRef.current = Date.now()

      const platform = getPlatformInfo()

      // Determine MIME type based on platform
      // iOS/Safari need MP4, Android/Chrome prefer WebM
      const mimeType = platform.needsMP4 ? 'video/mp4' : 'video/webm'

      console.log('[RecordRTC] Starting recording', {
        platform: platform.isIOS ? 'iOS' : platform.isAndroid ? 'Android' : 'Other',
        isWebView: platform.isWebView,
        mimeType,
        hasAudio: validation.audioTrackActive,
        hasVideo: validation.videoTrackActive,
      })

      // Configure RecordRTC with optimal settings for the platform
      const recorder = new RecordRTC(stream, {
        type: 'video',
        mimeType: mimeType as 'video/webm' | 'video/mp4',
        recorderType: RecordRTC.MediaStreamRecorder,

        // Audio settings
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,

        // Video quality settings
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000,  // 128 kbps

        // Frame rate
        frameRate: 30,

        // Disable logging in production
        disableLogs: process.env.NODE_ENV === 'production',

        // Time slice for data collection (helps with WebView issues)
        timeSlice: 100,

        // Handle data available (useful for debugging)
        ondataavailable: (blob: Blob) => {
          console.log('[RecordRTC] Data chunk available:', blob.size, 'bytes')
        },
      })

      recorderRef.current = recorder
      recorder.startRecording()
      setIsRecording(true)

      console.log('[RecordRTC] Recording started successfully')
    } catch (err) {
      console.error('[RecordRTC] Failed to start recording:', err)
      setError('Failed to start recording')
    }
  }, [stream, isSupported, RecordRTC])

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!recorderRef.current) {
        console.warn('[RecordRTC] No recorder to stop')
        resolve(recordedBlob)
        return
      }

      const recorder = recorderRef.current
      const platform = getPlatformInfo()
      const durationMs = Date.now() - startTimeRef.current

      stopResolveRef.current = resolve

      try {
        recorder.stopRecording(() => {
          const blob = recorder.getBlob()

          if (!blob || blob.size === 0) {
            console.error('[RecordRTC] Recording produced empty blob')
            setError('Recording failed - no data captured')
            setIsRecording(false)
            resolve(null)
            return
          }

          // Get the final MIME type, forcing MP4 on iOS
          const finalMimeType = getVideoMimeType(blob.type, platform)

          // Create a new blob with the correct MIME type if needed
          const finalBlob = blob.type !== finalMimeType
            ? new Blob([blob], { type: finalMimeType })
            : blob

          // Build diagnostics
          const diag: RecordingDiagnostics = {
            mimeType: finalMimeType,
            hasVideo: stream?.getVideoTracks().length ? stream.getVideoTracks().length > 0 : false,
            hasAudio: stream?.getAudioTracks().some(
              (t) => t.readyState === 'live' && t.enabled
            ) || false,
            blobSize: finalBlob.size,
            durationMs,
            platform: {
              isIOS: platform.isIOS,
              isAndroid: platform.isAndroid,
              isWebView: platform.isWebView,
            },
            recorderType: 'RecordRTC.MediaStreamRecorder',
          }

          console.log('[RecordRTC] Recording complete:', diag)
          setDiagnostics(diag)
          setRecordedBlob(finalBlob)
          setIsRecording(false)

          // Clean up recorder
          try {
            recorder.destroy()
          } catch (e) {
            console.warn('[RecordRTC] Error destroying recorder:', e)
          }
          recorderRef.current = null

          resolve(finalBlob)
        })
      } catch (err) {
        console.error('[RecordRTC] Error stopping recording:', err)
        setError('Failed to stop recording')
        setIsRecording(false)
        resolve(null)
      }
    })
  }, [recordedBlob, stream])

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
