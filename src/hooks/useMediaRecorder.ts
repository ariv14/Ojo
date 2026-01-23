'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface UseMediaRecorderReturn {
  start: () => void
  stop: () => Promise<Blob | null>
  recordedBlob: Blob | null
  isRecording: boolean
  isSupported: boolean
  error: string | null
}

function getSupportedMimeType(): string | null {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]

  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return null
}

export function useMediaRecorder(stream: MediaStream | null): UseMediaRecorderReturn {
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const stopResolveRef = useRef<((blob: Blob | null) => void) | null>(null)

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

    try {
      chunksRef.current = []
      setRecordedBlob(null)
      setError(null)

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const mimeTypeBase = mimeType.split(';')[0]
        const blob = new Blob(chunksRef.current, { type: mimeTypeBase })
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
  }
}
