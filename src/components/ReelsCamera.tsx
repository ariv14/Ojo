'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Webcam from 'react-webcam'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'

interface ReelsCameraProps {
  onCapture: (file: File, type: 'video' | 'photo') => void
  onClose: () => void
  onError: (error: string) => void
  maxDuration?: number
}

interface CapturedMedia {
  blob: Blob
  type: 'video' | 'photo'
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

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingProgress, setRecordingProgress] = useState(0)

  // Preview state
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia | null>(null)

  // Refs
  const webcamRef = useRef<Webcam>(null)
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recordingStartTimeRef = useRef<number>(0)
  const isHoldingRef = useRef(false)

  // MediaRecorder hook
  const { start: startRecording, stop: stopRecording, isSupported: isRecorderSupported } = useMediaRecorder(stream)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (capturedMedia?.previewUrl) URL.revokeObjectURL(capturedMedia.previewUrl)
    }
  }, [capturedMedia?.previewUrl])

  // Handle stream from webcam
  const handleUserMedia = useCallback((mediaStream: MediaStream) => {
    setStream(mediaStream)
    setHasPermission(true)
    setCameraError(null)
  }, [])

  // Handle camera errors
  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error('Camera error:', error)
    setHasPermission(false)

    if (typeof error === 'string') {
      setCameraError(error)
    } else if (error.name === 'NotAllowedError') {
      setCameraError('Camera access denied. Please allow camera access in your browser settings.')
    } else if (error.name === 'NotFoundError') {
      setCameraError('No camera found on this device.')
    } else if (error.name === 'NotReadableError') {
      setCameraError('Camera is in use by another application.')
    } else {
      setCameraError('Unable to access camera. Please try choosing from library instead.')
    }
  }, [])

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }, [])

  // Take photo
  const capturePhoto = useCallback(() => {
    if (!webcamRef.current) return

    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) {
      onError('Failed to capture photo')
      return
    }

    // Convert base64 to blob
    fetch(imageSrc)
      .then((res) => res.blob())
      .then((blob) => {
        const previewUrl = URL.createObjectURL(blob)
        setCapturedMedia({
          blob,
          type: 'photo',
          previewUrl,
        })
      })
      .catch(() => {
        onError('Failed to process photo')
      })
  }, [onError])

  // Start video recording
  const startVideoRecording = useCallback(() => {
    if (!isRecorderSupported) {
      onError('Video recording is not supported in this browser')
      return
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
  }, [isRecorderSupported, maxDuration, onError, startRecording])

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
        type: 'video',
        previewUrl,
      })
    }
  }, [stopRecording])

  // Handle press start (mouse/touch down)
  const handlePressStart = useCallback(() => {
    if (capturedMedia || isRecording) return

    isHoldingRef.current = true

    // Start timer to differentiate tap vs hold
    holdTimerRef.current = setTimeout(() => {
      if (isHoldingRef.current) {
        startVideoRecording()
      }
    }, 200)
  }, [capturedMedia, isRecording, startVideoRecording])

  // Handle press end (mouse/touch up)
  const handlePressEnd = useCallback(() => {
    const wasHolding = isHoldingRef.current
    isHoldingRef.current = false

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }

    if (isRecording) {
      // Was recording, stop it
      stopVideoRecording()
    } else if (wasHolding && !capturedMedia) {
      // Quick tap, take photo
      capturePhoto()
    }
  }, [isRecording, capturedMedia, stopVideoRecording, capturePhoto])

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

    const extension = capturedMedia.type === 'video' ? 'webm' : 'jpg'
    const mimeType = capturedMedia.type === 'video' ? 'video/webm' : 'image/jpeg'
    const filename = `capture-${Date.now()}.${extension}`

    const file = new File([capturedMedia.blob], filename, { type: mimeType })
    onCapture(file, capturedMedia.type)
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
          {capturedMedia.type === 'video' ? (
            <video
              src={capturedMedia.previewUrl}
              className="max-w-full max-h-full object-contain"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={capturedMedia.previewUrl}
              alt="Captured"
              className="max-w-full max-h-full object-contain"
            />
          )}
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
            <span className="text-white text-sm">Use {capturedMedia.type}</span>
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
          audio={true}
          videoConstraints={{
            facingMode,
            aspectRatio: 9 / 16,
          }}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          screenshotFormat="image/jpeg"
          className="h-full w-full object-cover"
          mirrored={facingMode === 'user'}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-12 pt-6 flex flex-col items-center">
        {/* Recording hint */}
        <p className="text-white/70 text-sm mb-4">
          {isRecording ? 'Recording...' : 'Tap for photo, hold for video'}
        </p>

        {/* Capture button with progress ring */}
        <div className="relative">
          {/* Progress ring SVG */}
          <svg
            className="absolute -inset-2 w-24 h-24 -rotate-90"
            viewBox="0 0 100 100"
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
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${
              isRecording ? 'bg-red-500 scale-90' : 'bg-white/20'
            }`}
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
