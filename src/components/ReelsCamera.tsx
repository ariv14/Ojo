'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Webcam from 'react-webcam'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'

interface ReelsCameraProps {
  onCapture: (file: File, type: 'video') => void
  onClose: () => void
  onError: (error: string) => void
  maxDuration?: number
}

interface CapturedMedia {
  blob: Blob
  previewUrl: string
}

export default function ReelsCamera({
  onCapture,
  onClose,
  onError,
  maxDuration = 10,
}: ReelsCameraProps) {
  // Camera state
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingProgress, setRecordingProgress] = useState(0)

  // Preview state
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia | null>(null)

  // Refs
  const webcamRef = useRef<Webcam>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recordingStartTimeRef = useRef<number>(0)
  const isRecordingRef = useRef(false)

  // MediaRecorder hook
  const { start: startRecording, stop: stopRecording, isSupported: isRecorderSupported } = useMediaRecorder(stream)

  // Sync ref with state for touch handlers (avoids stale closure bug)
  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (capturedMedia?.previewUrl) URL.revokeObjectURL(capturedMedia.previewUrl)
    }
  }, [capturedMedia?.previewUrl])

  // Request audio permission upfront (non-blocking)
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => setAudioStream(stream))
      .catch(() => console.log('Audio unavailable for recording'))

    return () => {
      // Cleanup audio stream on unmount
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop())
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle stream from webcam
  const handleUserMedia = useCallback((mediaStream: MediaStream) => {
    setStream(mediaStream)
    setHasPermission(true)
    setCameraError(null)
  }, [])

  // Handle camera errors
  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error('Camera error:', error)
    if (error instanceof DOMException) {
      console.error('Error name:', error.name, 'Message:', error.message)
    }
    setHasPermission(false)

    if (typeof error === 'string') {
      setCameraError(error)
    } else if (error.name === 'NotAllowedError') {
      setCameraError('Camera access denied. Please allow camera access in your browser settings.')
    } else if (error.name === 'NotFoundError') {
      setCameraError('No camera found on this device.')
    } else if (error.name === 'NotReadableError') {
      setCameraError('Camera is in use by another application.')
    } else if (error.name === 'OverconstrainedError') {
      setCameraError('Camera does not support the requested settings. Please try again.')
    } else {
      setCameraError('Unable to access camera. Please try choosing from library instead.')
    }
  }, [])

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }, [])

  // Start video recording (synchronous - audio is pre-acquired)
  const startVideoRecording = useCallback(() => {
    if (!isRecorderSupported) {
      onError('Video recording is not supported in this browser')
      return
    }

    if (!stream) {
      onError('No video stream available')
      return
    }

    // Add pre-acquired audio track if available
    if (audioStream) {
      const audioTrack = audioStream.getAudioTracks()[0]
      if (audioTrack && !stream.getAudioTracks().length) {
        stream.addTrack(audioTrack.clone())
      }
    }

    setIsRecording(true)
    setRecordingProgress(0)
    recordingStartTimeRef.current = Date.now()
    startRecording()

    // Progress update interval
    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000
      const progress = Math.min((elapsed / maxDuration) * 100, 100)
      setRecordingProgress(progress)
    }, 100)

    // Auto-stop at max duration
    recordingTimerRef.current = setTimeout(() => {
      stopVideoRecording()
    }, maxDuration * 1000)
  }, [isRecorderSupported, maxDuration, onError, startRecording, stream, audioStream])

  // Stop video recording
  const stopVideoRecording = useCallback(async () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    setIsRecording(false)
    setRecordingProgress(0)

    const blob = await stopRecording()
    if (blob) {
      const previewUrl = URL.createObjectURL(blob)
      setCapturedMedia({
        blob,
        previewUrl,
      })
    }
  }, [stopRecording])

  // Handle press start (mouse only) - start recording immediately
  const handlePressStart = useCallback(() => {
    if (capturedMedia || isRecording) return
    startVideoRecording()
  }, [capturedMedia, isRecording, startVideoRecording])

  // Handle press end (mouse only) - stop recording
  const handlePressEnd = useCallback(() => {
    if (isRecording) {
      stopVideoRecording()
    }
  }, [isRecording, stopVideoRecording])

  // Handle touch events with passive: false for WebView compatibility
  // Uses isRecordingRef instead of isRecording state to avoid stale closure bug:
  // If isRecording was in deps, touchstart would trigger state change → effect re-runs →
  // old listeners removed while finger still down → touchend never fires on new listener
  useEffect(() => {
    const button = buttonRef.current
    if (!button) return

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      if (capturedMedia || isRecordingRef.current) return
      startVideoRecording()
    }

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      if (isRecordingRef.current) {
        stopVideoRecording()
      }
    }

    button.addEventListener('touchstart', onTouchStart, { passive: false })
    button.addEventListener('touchend', onTouchEnd, { passive: false })
    button.addEventListener('touchcancel', onTouchEnd, { passive: false })

    return () => {
      button.removeEventListener('touchstart', onTouchStart)
      button.removeEventListener('touchend', onTouchEnd)
      button.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [capturedMedia, startVideoRecording, stopVideoRecording])

  // Handle retake
  const handleRetake = useCallback(() => {
    if (capturedMedia?.previewUrl) {
      URL.revokeObjectURL(capturedMedia.previewUrl)
    }
    setCapturedMedia(null)
  }, [capturedMedia])

  // Handle post
  const handlePost = useCallback(() => {
    if (!capturedMedia) return

    const file = new File([capturedMedia.blob], `capture-${Date.now()}.webm`, { type: 'video/webm' })
    onCapture(file, 'video')
  }, [capturedMedia, onCapture])

  // Fallback UI component
  const FallbackUI = () => (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Error message */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-white text-lg font-semibold mb-2">Camera Unavailable</h3>
        <p className="text-gray-400 text-sm mb-6">{cameraError || 'Unable to access the camera.'}</p>

        <button
          onClick={() => {
            setCameraError(null)
            setHasPermission(null)
          }}
          className="w-full max-w-xs py-3 bg-white text-black rounded-lg font-medium mb-3"
        >
          Try Again
        </button>
        <button
          onClick={onClose}
          className="w-full max-w-xs py-3 bg-white/10 text-white rounded-lg font-medium"
        >
          Choose from Library
        </button>
      </div>
    </div>
  )

  // Show fallback if camera error
  if (hasPermission === false || cameraError) {
    return createPortal(<FallbackUI />, document.body)
  }

  // Preview screen
  if (capturedMedia) {
    return createPortal(
      <div className="fixed inset-0 bg-black z-[60] flex flex-col">
        {/* Preview */}
        <div className="flex-1 flex items-center justify-center bg-black">
          <video
            src={capturedMedia.previewUrl}
            className="max-w-full max-h-full object-contain"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>

        {/* Actions */}
        <div className="p-6 flex items-center justify-center gap-12">
          <button
            onClick={handleRetake}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <span className="text-white text-sm">Retake</span>
          </button>

          <button
            onClick={handlePost}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-white text-sm">Use video</span>
          </button>
        </div>
      </div>,
      document.body
    )
  }

  // Camera view
  return createPortal(
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={switchCamera}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Camera feed */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={{
            facingMode: { ideal: facingMode },
          }}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          screenshotFormat="image/jpeg"
          screenshotQuality={1}
          className="h-full w-full object-cover"
          mirrored={facingMode === 'user'}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-12 pt-6 flex flex-col items-center">
        {/* Recording hint */}
        <p className="text-white/70 text-sm mb-4">
          {isRecording ? 'Recording...' : 'Hold to record'}
        </p>

        {/* Capture button with progress ring */}
        <div className="relative">
          {/* Progress ring SVG - pointer-events: none to not intercept button touches */}
          <svg
            className="absolute -inset-2 w-24 h-24 -rotate-90"
            viewBox="0 0 100 100"
            style={{ pointerEvents: 'none' }}
          >
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="4"
            />
            {/* Progress ring */}
            {isRecording && (
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="#ef4444"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${recordingProgress * 2.89} 289`}
                className="transition-all duration-100"
              />
            )}
          </svg>

          {/* Capture button */}
          <button
            ref={buttonRef}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${
              isRecording ? 'bg-red-500 scale-90' : 'bg-white/20'
            }`}
            style={{ touchAction: 'none', userSelect: 'none' }}
          >
            {isRecording ? (
              <div className="w-8 h-8 rounded bg-white" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white" />
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
