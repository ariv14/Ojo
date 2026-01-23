'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRecordRTC } from '@/hooks/useRecordRTC'
import { getPlatformInfo, getVideoFileExtension, getVideoMimeType } from '@/utils/platform'
import { validateStreamForRecording } from '@/utils/audioMerger'
import { safeUnmuteVideo } from '@/utils/audioUnlock'

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
  const [userGestureReceived, setUserGestureReceived] = useState(false)
  const [cameraInitiated, setCameraInitiated] = useState(false)

  // Debug state for Android WebView troubleshooting
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)

  // System camera fallback state (when mic is blocked by WebView sandbox)
  const [systemCameraMode, setSystemCameraMode] = useState(false)
  const nativeInputRef = useRef<HTMLInputElement>(null)

  // Helper to add debug log entries (keeps last 10)
  const addDebugLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setDebugLog(prev => [...prev.slice(-9), `[${timestamp}] ${msg}`])
    console.log(`[ReelsCamera] ${msg}`)
  }

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingProgress, setRecordingProgress] = useState(0)

  // Preview state
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia | null>(null)
  const [previewMuted, setPreviewMuted] = useState(true)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recordingStartTimeRef = useRef<number>(0)
  const isRecordingRef = useRef(false)

  // RecordRTC hook - more robust than native MediaRecorder for WebView environments
  const { start: startRecording, stop: stopRecording, isSupported: isRecorderSupported } = useRecordRTC(stream)

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

  // Request audio with user gesture - Android WebView requires user interaction for mic
  const requestAudioWithGesture = useCallback(async () => {
    if (!stream) return

    addDebugLog('User gesture: requesting mic...')
    setUserGestureReceived(true)

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      })

      // Combine existing video with new audio
      const combinedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ])

      // Stop old stream's video track reference (it's now in combinedStream)
      setStream(combinedStream)
      addDebugLog('✓ Mic added via user gesture')
    } catch (err) {
      const e = err as DOMException
      addDebugLog(`✗ Mic gesture failed: ${e.name}: ${e.message}`)
    }
  }, [stream])

  // Manual stream acquisition with audio fallback
  // This replaces react-webcam's automatic getUserMedia to handle mic permission denial gracefully
  // Only runs when cameraInitiated is true (user clicked "Start Camera")
  useEffect(() => {
    if (!cameraInitiated) return // Wait for user gesture to initiate camera

    let mounted = true
    let currentStream: MediaStream | null = null

    const acquireStream = async () => {
      const videoConstraints = { facingMode: { ideal: facingMode } }
      addDebugLog(`Starting stream acquisition (facing: ${facingMode})`)

      // Check mic permission status first (if Permissions API available)
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          addDebugLog(`Mic permission: ${micPermission.state}`)
        }
      } catch (e) {
        addDebugLog('Permissions API unavailable')
      }

      // Strategy 1: Try video + audio together with simple audio: true
      // This works best on Android WebView where complex constraints may fail
      try {
        addDebugLog('Strategy 1: video+audio together...')
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: true,
        })
        if (!mounted) {
          mediaStream.getTracks().forEach(t => t.stop())
          return
        }
        currentStream = mediaStream
        setStream(mediaStream)
        setHasPermission(true)
        setCameraError(null)

        const audioTracks = mediaStream.getAudioTracks()
        const videoTracks = mediaStream.getVideoTracks()
        addDebugLog(`✓ Strategy 1 OK: ${videoTracks.length} video, ${audioTracks.length} audio`)
        if (audioTracks.length > 0) {
          addDebugLog(`Audio: ${audioTracks[0].label || 'unlabeled'} (${audioTracks[0].readyState})`)
        }
        return
      } catch (err) {
        const e = err as DOMException
        addDebugLog(`✗ Strategy 1 failed: ${e.name}: ${e.message}`)

        // Check if mic is specifically blocked (NotAllowedError) - offer system camera
        if (e.name === 'NotAllowedError') {
          try {
            // Test if video-only works (mic specifically blocked)
            const testStream = await navigator.mediaDevices.getUserMedia({
              video: videoConstraints,
              audio: false,
            })
            testStream.getTracks().forEach(t => t.stop())

            // Video works, mic blocked by WebView sandbox - offer system camera
            if (mounted) {
              addDebugLog('Mic blocked by WebView, offering system camera')
              setSystemCameraMode(true)
              setHasPermission(true) // Not a full permission error
            }
            return
          } catch {
            // Both blocked - continue to next strategy
            addDebugLog('Both video and audio blocked, continuing...')
          }
        }
      }

      // Strategy 2: Get video first, then immediately try to add audio
      try {
        addDebugLog('Strategy 2: video first, then audio...')
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        })
        if (!mounted) {
          videoStream.getTracks().forEach(t => t.stop())
          return
        }

        setHasPermission(true)
        setCameraError(null)
        addDebugLog('✓ Video acquired, requesting audio...')

        // Immediately try to add audio (may work on some devices without gesture)
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          })
          if (!mounted) {
            videoStream.getTracks().forEach(t => t.stop())
            audioStream.getTracks().forEach(t => t.stop())
            return
          }
          const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ])
          currentStream = combinedStream
          setStream(combinedStream)
          addDebugLog('✓ Strategy 2 OK: video+audio combined')
          return
        } catch (audioErr) {
          // Audio failed - use video only, user can tap Enable Mic
          const e = audioErr as DOMException
          addDebugLog(`✗ Audio add failed: ${e.name}: ${e.message}`)
          currentStream = videoStream
          setStream(videoStream)
          addDebugLog('Video only - tap Enable Mic for audio')
          return
        }
      } catch (err) {
        const e = err as DOMException
        addDebugLog(`✗ Strategy 2 video failed: ${e.name}: ${e.message}`)
      }

      // Strategy 3: Last resort - video only
      try {
        addDebugLog('Strategy 3: video only (last resort)...')
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        })
        if (!mounted) {
          mediaStream.getTracks().forEach(t => t.stop())
          return
        }
        currentStream = mediaStream
        setStream(mediaStream)
        setHasPermission(true)
        setCameraError(null)
        addDebugLog('✓ Strategy 3 OK: video only')
      } catch (err) {
        const e = err as DOMException
        addDebugLog(`✗ All strategies failed: ${e.name}: ${e.message}`)
        if (mounted) {
          handleUserMediaError(err as DOMException)
        }
      }
    }

    acquireStream()

    return () => {
      mounted = false
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop())
      }
    }
  }, [facingMode, handleUserMediaError, cameraInitiated])

  // Connect stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }, [])

  // Start video recording (stream may have audio if mic permission was granted)
  const startVideoRecording = useCallback(() => {
    if (!isRecorderSupported) {
      onError('Video recording is not supported in this browser')
      return
    }

    if (!stream) {
      onError('No video stream available')
      return
    }

    // Validate the stream before recording
    const validation = validateStreamForRecording(stream)
    if (!validation.valid) {
      onError(`Stream not ready: ${validation.errors.join(', ')}`)
      return
    }

    // Log audio status
    if (!validation.audioTrackActive) {
      console.warn('Recording will proceed without audio')
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
  }, [isRecorderSupported, maxDuration, onError, startRecording, stream])

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
    setPreviewMuted(true) // Reset mute state for next recording
  }, [capturedMedia])

  // Handle post with platform-aware file extension
  const handlePost = useCallback(() => {
    if (!capturedMedia) return

    const platform = getPlatformInfo()

    // Get proper MIME type and extension for the platform
    const mimeType = getVideoMimeType(capturedMedia.blob.type, platform)
    const ext = getVideoFileExtension(capturedMedia.blob.type, platform)

    const file = new File(
      [capturedMedia.blob],
      `capture-${Date.now()}.${ext}`,
      { type: mimeType }
    )
    onCapture(file, 'video')
  }, [capturedMedia, onCapture])

  // Handle native system camera capture (fallback when mic is blocked)
  const handleNativeCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return // User cancelled - stay on system camera screen
    onCapture(file, 'video')
  }, [onCapture])

  // Handle preview unmute with iOS AudioContext unlock
  const handlePreviewUnmute = useCallback(async () => {
    if (previewVideoRef.current) {
      const success = await safeUnmuteVideo(previewVideoRef.current)
      if (success) {
        setPreviewMuted(false)
      }
    }
  }, [])

  // Toggle preview mute
  const togglePreviewMute = useCallback(() => {
    if (previewMuted) {
      handlePreviewUnmute()
    } else {
      if (previewVideoRef.current) {
        previewVideoRef.current.muted = true
      }
      setPreviewMuted(true)
    }
  }, [previewMuted, handlePreviewUnmute])

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

  // System camera UI (when mic is blocked by WebView sandbox)
  const SystemCameraUI = () => (
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

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h3 className="text-white text-lg font-semibold mb-2">In-App Audio Blocked</h3>
        <p className="text-gray-400 text-sm mb-6">
          Your browser restricts microphone access in this app.{'\n'}
          Use your system camera to record with sound.
        </p>

        <button
          onClick={() => nativeInputRef.current?.click()}
          className="w-full max-w-xs py-4 bg-green-500 text-white rounded-xl font-semibold text-lg mb-3 active:bg-green-600 transition-colors"
        >
          Open System Camera
        </button>

        <button
          onClick={() => {
            setSystemCameraMode(false)
            setCameraInitiated(false)
          }}
          className="w-full max-w-xs py-3 bg-white/10 text-white rounded-lg font-medium mb-3"
        >
          Try Again
        </button>

        <button
          onClick={onClose}
          className="text-gray-400 text-sm hover:text-gray-300"
        >
          Choose from Library
        </button>
      </div>

      {/* Hidden native file input - opens system video camera for recording */}
      <input
        ref={nativeInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleNativeCapture}
        className="hidden"
      />
    </div>
  )

  // Show system camera UI when mic is blocked
  if (systemCameraMode) {
    return createPortal(<SystemCameraUI />, document.body)
  }

  // Show fallback if camera error
  if (hasPermission === false || cameraError) {
    return createPortal(<FallbackUI />, document.body)
  }

  // Preview screen
  if (capturedMedia) {
    return createPortal(
      <div className="fixed inset-0 bg-black z-[60] flex flex-col">
        {/* Preview */}
        <div className="flex-1 flex items-center justify-center bg-black relative">
          <video
            ref={previewVideoRef}
            src={capturedMedia.previewUrl}
            className="max-w-full max-h-full object-contain"
            autoPlay
            loop
            muted={previewMuted}
            playsInline
            webkit-playsinline="true"
          />
          {/* Mute toggle for preview */}
          <button
            onClick={togglePreviewMute}
            className={`absolute bottom-4 right-4 bg-black/60 text-white p-3 rounded-full z-10 ${previewMuted ? 'animate-pulse' : ''}`}
          >
            {previewMuted ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
          {/* Tap to unmute hint */}
          {previewMuted && (
            <div className="absolute bottom-16 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded animate-pulse">
              Tap to hear audio
            </div>
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
            <span className="text-white text-sm">Use video</span>
          </button>
        </div>
      </div>,
      document.body
    )
  }

  // Start screen - show before camera is initiated (requires user gesture for Android WebView)
  if (!cameraInitiated) {
    return createPortal(
      <div className="fixed inset-0 bg-black z-[60] flex flex-col">
        {/* Header with close button */}
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

        {/* Start button - centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Record a Reel</h2>
          <p className="text-gray-400 text-sm text-center mb-8">
            Tap below to enable camera and microphone
          </p>
          <button
            onClick={() => {
              addDebugLog('User tapped Start Camera')
              setCameraInitiated(true)
            }}
            className="w-full max-w-xs py-4 bg-red-500 text-white rounded-xl font-semibold text-lg active:bg-red-600 transition-colors"
          >
            Start Camera
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

      {/* Debug overlay - toggleable for troubleshooting */}
      {debugLog.length > 0 && (
        <div className="absolute top-16 left-2 right-2 z-50">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="bg-black/60 text-green-400 text-xs px-2 py-1 rounded mb-1"
          >
            {showDebug ? 'Hide' : 'Show'} Debug ({debugLog.length})
          </button>
          {showDebug && (
            <pre className="bg-black/80 text-green-400 text-xs p-2 rounded max-h-40 overflow-auto font-mono">
              {debugLog.join('\n')}
            </pre>
          )}
        </div>
      )}

      {/* Camera feed */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
      </div>

      {/* Controls */}
      <div
        className="absolute bottom-0 left-0 right-0 pt-6 flex flex-col items-center"
        style={{ paddingBottom: 'max(48px, calc(env(safe-area-inset-bottom) + 24px))' }}
      >
        {/* No mic - show enable button or settings hint */}
        {stream && !stream.getAudioTracks().length && !isRecording && (
          <div className="mb-3 mx-4 max-w-xs">
            {!userGestureReceived ? (
              <button
                onClick={requestAudioWithGesture}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                Tap to Enable Microphone
              </button>
            ) : (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg px-3 py-2">
                <p className="text-yellow-200 text-xs text-center">
                  Mic not available. Enable in Settings → Apps → World App → Permissions
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recording hint with mic status */}
        <div className="flex items-center gap-2 mb-4">
          {/* Mic status indicator - green if stream has audio tracks, dim if not */}
          <div className={`flex items-center gap-1 ${
            isRecording ? 'text-red-400' :
            stream?.getAudioTracks().length ? 'text-green-400' :
            stream ? 'text-yellow-400' : 'text-yellow-400'
          }`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-white/70 text-sm">
            {isRecording ? 'Recording...' :
             stream ? (stream.getAudioTracks().length ? 'Hold to record' : 'Hold to record (no mic)') :
             'Preparing camera...'}
          </p>
        </div>

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
