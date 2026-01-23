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
}

interface UseMediaRecorderReturn {
  start: () => void
  stop: () => Promise<Blob | null>
  recordedBlob: Blob | null
  isRecording: boolean
  isSupported: boolean
  error: string | null
  diagnostics: RecordingDiagnostics | null
  streamValidation: StreamValidation | null
}

function getSupportedMimeType(): string | null {
  const platform = getPlatformInfo()
  return platform.supportedVideoMimeType
}

export function useMediaRecorder(stream: MediaStream | null): UseMediaRecorderReturn {
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<RecordingDiagnostics | null>(null)
  const [streamValidation, setStreamValidation] = useState<StreamValidation | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const stopResolveRef = useRef<((blob: Blob | null) => void) | null>(null)
  const startTimeRef = useRef<number>(0)

  const isSupported = typeof MediaRecorder !== 'undefined' && getSupportedMimeType() !== null

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const start = useCallback(() => {
    if (!stream) {
      setError('No media stream available')
      return
    }

    if (!isSupported) {
      setError('MediaRecorder is not supported in this browser')
      return
    }

    const mimeType = getSupportedMimeType()
    if (!mimeType) {
      setError('No supported video format found')
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
      console.warn('Recording will have no audio - audio track not active')
    }

    try {
      chunksRef.current = []
      setRecordedBlob(null)
      setError(null)
      setDiagnostics(null)
      startTimeRef.current = Date.now()

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const platform = getPlatformInfo()
        const durationMs = Date.now() - startTimeRef.current

        // Get proper MIME type - force video/mp4 on iOS
        const finalMimeType = getVideoMimeType(mimeType, platform)
        const blob = new Blob(chunksRef.current, { type: finalMimeType })

        // Build diagnostics
        const diag: RecordingDiagnostics = {
          mimeType: finalMimeType,
          hasVideo: stream.getVideoTracks().length > 0,
          hasAudio: stream.getAudioTracks().some(
            (t) => t.readyState === 'live' && t.enabled
          ),
          blobSize: blob.size,
          durationMs,
          platform: {
            isIOS: platform.isIOS,
            isAndroid: platform.isAndroid,
            isWebView: platform.isWebView,
          },
        }

        console.log('Recording complete:', diag)
        setDiagnostics(diag)
        setRecordedBlob(blob)
        setIsRecording(false)

        // Resolve the stop promise if it exists
        if (stopResolveRef.current) {
          stopResolveRef.current(blob)
          stopResolveRef.current = null
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setError('Recording failed')
        setIsRecording(false)

        if (stopResolveRef.current) {
          stopResolveRef.current(null)
          stopResolveRef.current = null
        }
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
      setError('Failed to start recording')
    }
  }, [stream, isSupported])

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(recordedBlob)
        return
      }

      stopResolveRef.current = resolve
      mediaRecorderRef.current.stop()
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
