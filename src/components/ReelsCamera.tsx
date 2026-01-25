'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { safeUnmuteVideo } from '@/utils/audioUnlock'

interface ReelsCameraProps {
  onCapture: (file: File) => void
  onClose: () => void
}

const MAX_DURATION = 10 // seconds

export default function ReelsCamera({ onCapture, onClose }: ReelsCameraProps) {
  const {
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
    setStream,
    setHasAudio,
  } = useMediaRecorder({ maxDuration: MAX_DURATION })

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [isPreviewMuted, setIsPreviewMuted] = useState(true)
  const [showNoAudioWarning, setShowNoAudioWarning] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  // Connect stream to video element when ready
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // Create preview URL when recording stops
  useEffect(() => {
    if (videoBlob && state === 'stopped') {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
      previewUrlRef.current = URL.createObjectURL(videoBlob)
    }
  }, [videoBlob, state])

  // Show warning if audio failed
  useEffect(() => {
    if (state === 'ready' && !hasAudio) {
      setShowNoAudioWarning(true)
    }
  }, [state, hasAudio])

  // Request permissions on mount
  useEffect(() => {
    requestPermissions()
  }, [requestPermissions])

  /**
   * Switch between front and back camera
   */
  const switchCamera = useCallback(async () => {
    if (state === 'recording') return

    const newFacing = facingMode === 'user' ? 'environment' : 'user'

    // Stop current stream tracks
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }

    // Get new stream with switched camera
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacing,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      })

      // Critical fix: Update the hook's stream state so recording uses the new camera
      setStream(newStream)
      setHasAudio(true)
      setFacingMode(newFacing)

      if (videoRef.current) {
        videoRef.current.srcObject = newStream
      }
    } catch (err) {
      // Fallback: try video only if audio fails
      try {
        const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: newFacing,
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
        })

        setStream(videoOnlyStream)
        setHasAudio(false)
        setFacingMode(newFacing)

        if (videoRef.current) {
          videoRef.current.srcObject = videoOnlyStream
        }
      } catch (fallbackErr) {
        console.error('Failed to switch camera:', err, fallbackErr)
      }
    }
  }, [facingMode, state, stream, setStream, setHasAudio])

  /**
   * Handle capture button press (start recording)
   */
  const handleCapturePress = useCallback(() => {
    if (state === 'ready') {
      startRecording()
    }
  }, [state, startRecording])

  /**
   * Handle capture button release (stop recording)
   */
  const handleCaptureRelease = useCallback(() => {
    if (state === 'recording') {
      stopRecording()
    }
  }, [state, stopRecording])

  /**
   * Touch event handlers with preventDefault to fix Android responsiveness
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault() // Prevent ghost clicks and browser touch handling
    handleCapturePress()
  }, [handleCapturePress])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    handleCaptureRelease()
  }, [handleCaptureRelease])

  const handleTouchCancel = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    handleCaptureRelease()
  }, [handleCaptureRelease])

  /**
   * Toggle preview audio
   */
  const togglePreviewAudio = useCallback(async () => {
    if (!previewVideoRef.current) return

    if (isPreviewMuted) {
      const success = await safeUnmuteVideo(previewVideoRef.current)
      if (success) {
        setIsPreviewMuted(false)
      }
    } else {
      previewVideoRef.current.muted = true
      setIsPreviewMuted(true)
    }
  }, [isPreviewMuted])

  /**
   * Confirm the recording and pass to parent
   */
  const handleConfirm = useCallback(() => {
    if (!videoBlob) return

    const file = new File(
      [videoBlob],
      `reel-${Date.now()}.mp4`,
      { type: videoBlob.type || 'video/mp4' }
    )
    onCapture(file)
  }, [videoBlob, onCapture])

  /**
   * Retake - go back to camera
   */
  const handleRetake = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    reset()
    requestPermissions()
  }, [reset, requestPermissions])

  /**
   * Calculate progress for the circular indicator
   */
  const progress = Math.min(elapsed / MAX_DURATION, 1)
  const circumference = 2 * Math.PI * 38 // radius 38
  const strokeDashoffset = circumference * (1 - progress)

  // Permission requesting screen
  if (state === 'requesting') {
    return createPortal(
      <div className="fixed inset-0 bg-black z-[70] flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6" />
        <p className="text-white text-lg font-medium text-center">
          Requesting camera access...
        </p>
        <p className="text-gray-400 text-sm text-center mt-2">
          Please allow camera and microphone access
        </p>
      </div>,
      document.body
    )
  }

  // Error screen
  if (state === 'error' || (state === 'idle' && error)) {
    return createPortal(
      <div className="fixed inset-0 bg-black z-[70] flex flex-col items-center justify-center px-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-white text-xl font-semibold text-center mb-2">
          Camera Access Required
        </h2>

        <p className="text-gray-400 text-center mb-8 max-w-xs">
          {error || 'Please allow camera and microphone access to record videos.'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/10 text-white rounded-full font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              reset()
              requestPermissions()
            }}
            className="px-6 py-3 bg-white text-black rounded-full font-medium"
          >
            Try Again
          </button>
        </div>
      </div>,
      document.body
    )
  }

  // Preview screen (after recording)
  if (state === 'stopped' && previewUrlRef.current) {
    return createPortal(
      <div className="fixed inset-0 bg-black z-[70] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 shrink-0">
          <button
            onClick={handleRetake}
            className="flex items-center gap-2 text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retake
          </button>
          <span className="text-white font-medium">Preview</span>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-green-500 text-white rounded-full font-medium"
          >
            Use Video
          </button>
        </div>

        {/* Video preview */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="relative w-full max-w-md aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden">
            <video
              ref={previewVideoRef}
              src={previewUrlRef.current}
              className="w-full h-full object-cover"
              loop
              autoPlay
              playsInline
              muted={isPreviewMuted}
            />

            {/* Audio toggle */}
            {hasAudio && (
              <button
                onClick={togglePreviewAudio}
                className="absolute bottom-4 right-4 w-12 h-12 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm"
              >
                {isPreviewMuted ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Duration info */}
        <div className="p-4 pb-8 shrink-0">
          <p className="text-gray-400 text-sm text-center">
            Duration: {elapsed.toFixed(1)}s
            {!hasAudio && ' (no audio)'}
          </p>
        </div>
      </div>,
      document.body
    )
  }

  // Camera view (ready/recording)
  return createPortal(
    <div className="fixed inset-0 bg-black z-[70] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 shrink-0 relative z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Recording indicator */}
        {state === 'recording' && (
          <div className="flex items-center gap-2 bg-red-500/80 px-3 py-1.5 rounded-full backdrop-blur-sm">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-sm font-medium">
              {elapsed.toFixed(1)}s
            </span>
          </div>
        )}

        {/* Switch camera */}
        <button
          onClick={switchCamera}
          disabled={state === 'recording'}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm disabled:opacity-50"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Camera preview */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          }`}
          autoPlay
          playsInline
          muted
        />

        {/* No audio warning */}
        {showNoAudioWarning && (
          <div className="absolute top-4 inset-x-4 bg-yellow-500/90 text-black text-sm p-3 rounded-lg text-center">
            <p className="font-medium">Recording without audio</p>
            <p className="text-xs mt-1">Microphone access was denied</p>
            <button
              onClick={() => setShowNoAudioWarning(false)}
              className="mt-2 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 pb-8 shrink-0 flex flex-col items-center">
        {/* Capture button with progress ring - larger touch target for small screens */}
        <div className="relative touch-none" style={{ touchAction: 'none' }}>
          {/* Progress ring SVG */}
          <svg
            className="absolute inset-0 w-[84px] h-[84px] -rotate-90 pointer-events-none"
            viewBox="0 0 84 84"
          >
            {/* Background circle */}
            <circle
              cx="42"
              cy="42"
              r="38"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="4"
            />
            {/* Progress circle */}
            {state === 'recording' && (
              <circle
                cx="42"
                cy="42"
                r="38"
                fill="none"
                stroke="#ef4444"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
              />
            )}
          </svg>

          {/* Button with improved touch handling for Android */}
          <button
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onMouseDown={handleCapturePress}
            onMouseUp={handleCaptureRelease}
            onMouseLeave={state === 'recording' ? handleCaptureRelease : undefined}
            disabled={state !== 'ready' && state !== 'recording'}
            className={`w-[84px] h-[84px] rounded-full flex items-center justify-center transition-transform select-none ${
              state === 'recording' ? 'scale-90' : ''
            } disabled:opacity-50`}
            style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
          >
            <div
              className={`rounded-full transition-all pointer-events-none ${
                state === 'recording'
                  ? 'w-8 h-8 bg-red-500 rounded-lg'
                  : 'w-[68px] h-[68px] bg-white'
              }`}
            />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-gray-400 text-sm mt-4 text-center">
          {state === 'recording'
            ? 'Release to stop'
            : 'Hold to record (max 10s)'}
        </p>
      </div>
    </div>,
    document.body
  )
}
