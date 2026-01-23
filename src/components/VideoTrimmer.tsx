'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

interface VideoTrimmerProps {
  file: File
  duration: number
  onComplete: (trimmedFile: File) => void
  onCancel: () => void
  maxDuration?: number
}

export default function VideoTrimmer({
  file,
  duration,
  onComplete,
  onCancel,
  maxDuration = 10,
}: VideoTrimmerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [startTime, setStartTime] = useState(0)
  const [previewTime, setPreviewTime] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const videoUrlRef = useRef<string | null>(null)
  const isDraggingRef = useRef(false)

  // Clean up video URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current)
      }
    }
  }, [])

  // Load FFmpeg on mount
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const ffmpeg = new FFmpeg()
        ffmpegRef.current = ffmpeg

        ffmpeg.on('progress', ({ progress }) => {
          setProgress(Math.round(progress * 100))
        })

        // Load single-threaded FFmpeg (no SharedArrayBuffer issues in WebView)
        await ffmpeg.load({
          coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
          wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
        })

        setIsLoading(false)
      } catch (err) {
        console.error('FFmpeg load error:', err)
        setError('Failed to load video processor. Please try again.')
        setIsLoading(false)
      }
    }

    loadFFmpeg()

    // Create preview URL
    videoUrlRef.current = URL.createObjectURL(file)

    return () => {
      // Cleanup FFmpeg
      if (ffmpegRef.current) {
        ffmpegRef.current.terminate()
      }
    }
  }, [file])

  // Sync video playback with preview time
  useEffect(() => {
    if (videoRef.current && !isDraggingRef.current) {
      videoRef.current.currentTime = previewTime
    }
  }, [previewTime])

  // Handle timeline drag
  const handleTimelineChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseFloat(e.target.value)
    const maxStart = Math.max(0, duration - maxDuration)
    const clampedStart = Math.min(newStart, maxStart)
    setStartTime(clampedStart)
    setPreviewTime(clampedStart)
  }, [duration, maxDuration])

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }, [])

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  // Trim the video
  const handleTrim = useCallback(async () => {
    if (!ffmpegRef.current) {
      setError('Video processor not ready')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const ffmpeg = ffmpegRef.current

      // Write input file to FFmpeg filesystem
      await ffmpeg.writeFile('input', await fetchFile(file))

      // Calculate trim parameters
      const trimDuration = Math.min(maxDuration, duration - startTime)

      // Trim command: stream copy for speed (no re-encoding)
      await ffmpeg.exec([
        '-ss', startTime.toFixed(3),
        '-i', 'input',
        '-t', trimDuration.toFixed(3),
        '-c', 'copy',
        '-avoid_negative_ts', 'make_zero',
        'output.mp4'
      ])

      // Read output file
      const data = await ffmpeg.readFile('output.mp4')

      // Create trimmed file
      // FFmpeg returns Uint8Array for binary data - copy to fresh ArrayBuffer for Blob compatibility
      const uint8Array = data as Uint8Array
      const buffer = new ArrayBuffer(uint8Array.byteLength)
      new Uint8Array(buffer).set(uint8Array)
      const trimmedBlob = new Blob([buffer], { type: 'video/mp4' })
      const trimmedFile = new File(
        [trimmedBlob],
        `trimmed-${Date.now()}.mp4`,
        { type: 'video/mp4' }
      )

      // Clean up FFmpeg filesystem
      await ffmpeg.deleteFile('input')
      await ffmpeg.deleteFile('output.mp4')

      onComplete(trimmedFile)
    } catch (err) {
      console.error('Trim error:', err)
      setError('Failed to trim video. Please try again.')
      setIsProcessing(false)
    }
  }, [file, duration, startTime, maxDuration, onComplete])

  // Format time as MM:SS.s
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(1)
    return `${mins}:${secs.padStart(4, '0')}`
  }

  const endTime = Math.min(startTime + maxDuration, duration)
  const selectionWidth = ((endTime - startTime) / duration) * 100
  const selectionLeft = (startTime / duration) * 100

  return createPortal(
    <div className="fixed inset-0 bg-black z-[70] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 shrink-0">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 disabled:opacity-50"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-white font-semibold">Trim Video</h2>
        <button
          onClick={handleTrim}
          disabled={isLoading || isProcessing}
          className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Done'}
        </button>
      </div>

      {/* Video Preview */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-4">
        {videoUrlRef.current && (
          <video
            ref={videoRef}
            src={videoUrlRef.current}
            className="max-w-full max-h-full object-contain rounded-lg"
            muted
            playsInline
          />
        )}
      </div>

      {/* Timeline Controls */}
      <div className="p-4 pb-8 space-y-4 shrink-0">
        {/* Time indicators */}
        <div className="flex justify-between text-white text-sm">
          <span>{formatTime(startTime)}</span>
          <span className="text-green-400">{maxDuration}s selected</span>
          <span>{formatTime(endTime)}</span>
        </div>

        {/* Timeline slider with selection highlight */}
        <div className="relative h-12">
          {/* Track background */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-white/20 rounded-full" />

          {/* Selection highlight */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-2 bg-green-500 rounded-full"
            style={{
              left: `${selectionLeft}%`,
              width: `${selectionWidth}%`,
            }}
          />

          {/* Slider input */}
          <input
            type="range"
            min={0}
            max={Math.max(0, duration - maxDuration)}
            step={0.1}
            value={startTime}
            onChange={handleTimelineChange}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
            disabled={isLoading || isProcessing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          {/* Playhead indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-white rounded shadow-lg pointer-events-none"
            style={{ left: `calc(${selectionLeft}% - 8px)` }}
          />
        </div>

        {/* Duration info */}
        <p className="text-gray-400 text-xs text-center">
          Video: {formatTime(duration)} total • Drag to select {maxDuration}s clip
        </p>

        {/* Loading/Processing overlay */}
        {(isLoading || isProcessing) && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-white font-medium">
              {isLoading ? 'Loading video processor...' : `Processing... ${progress}%`}
            </p>
            {isProcessing && (
              <div className="w-48 h-2 bg-white/20 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute bottom-20 inset-x-4 bg-red-500/90 text-white text-sm p-3 rounded-lg text-center">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
