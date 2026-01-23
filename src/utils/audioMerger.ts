/**
 * Audio stream acquisition and merging utilities
 * Handles robust audio capture with retry logic and validation
 */

export interface StreamValidation {
  valid: boolean
  videoTrackActive: boolean
  audioTrackActive: boolean
  errors: string[]
}

/**
 * Acquires an audio stream with retry logic
 * @param maxRetries Maximum number of retry attempts
 * @param delayMs Delay between retries in milliseconds
 * @returns AudioStream or null if acquisition fails
 */
export async function acquireAudioStream(
  maxRetries: number = 3,
  delayMs: number = 500
): Promise<MediaStream | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Validate the acquired audio track
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack && audioTrack.readyState === 'live' && audioTrack.enabled) {
        console.log(`Audio stream acquired on attempt ${attempt}`)
        return stream
      }

      // Track exists but is not in a good state - stop it and retry
      console.warn(`Audio track not ready (state: ${audioTrack?.readyState}), retrying...`)
      stream.getTracks().forEach((track) => track.stop())

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    } catch (error) {
      console.warn(`Audio acquisition attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  console.log('Audio acquisition failed after all retries')
  return null
}

/**
 * Merges an audio stream into a video stream
 * Validates that the audio track is live and enabled before adding
 * @returns The merged stream (modifies the video stream in place)
 */
export function mergeAudioToVideoStream(
  videoStream: MediaStream,
  audioStream: MediaStream | null
): MediaStream {
  if (!audioStream) {
    console.log('No audio stream to merge')
    return videoStream
  }

  // Check if video stream already has audio
  if (videoStream.getAudioTracks().length > 0) {
    console.log('Video stream already has audio tracks')
    return videoStream
  }

  const audioTrack = audioStream.getAudioTracks()[0]
  if (!audioTrack) {
    console.warn('Audio stream has no audio tracks')
    return videoStream
  }

  // Validate audio track state
  if (audioTrack.readyState !== 'live') {
    console.warn(`Audio track not live (state: ${audioTrack.readyState})`)
    return videoStream
  }

  if (!audioTrack.enabled) {
    console.warn('Audio track is disabled')
    return videoStream
  }

  // Clone the track to avoid issues with shared track state
  const clonedTrack = audioTrack.clone()
  videoStream.addTrack(clonedTrack)
  console.log('Audio track merged successfully')

  return videoStream
}

/**
 * Validates a stream is ready for recording
 * Checks both video and audio tracks for proper state
 */
export function validateStreamForRecording(
  stream: MediaStream | null
): StreamValidation {
  const errors: string[] = []

  if (!stream) {
    return {
      valid: false,
      videoTrackActive: false,
      audioTrackActive: false,
      errors: ['No stream provided'],
    }
  }

  // Check video tracks
  const videoTracks = stream.getVideoTracks()
  let videoTrackActive = false

  if (videoTracks.length === 0) {
    errors.push('No video tracks in stream')
  } else {
    const videoTrack = videoTracks[0]
    if (videoTrack.readyState !== 'live') {
      errors.push(`Video track not live (state: ${videoTrack.readyState})`)
    } else if (!videoTrack.enabled) {
      errors.push('Video track is disabled')
    } else {
      videoTrackActive = true
    }
  }

  // Check audio tracks (optional but we want to know)
  const audioTracks = stream.getAudioTracks()
  let audioTrackActive = false

  if (audioTracks.length === 0) {
    // Not an error - audio is optional
    console.log('Stream has no audio tracks (audio will not be recorded)')
  } else {
    const audioTrack = audioTracks[0]
    if (audioTrack.readyState !== 'live') {
      console.warn(`Audio track not live (state: ${audioTrack.readyState})`)
    } else if (!audioTrack.enabled) {
      console.warn('Audio track is disabled')
    } else {
      audioTrackActive = true
    }
  }

  return {
    valid: videoTrackActive, // Recording is valid if we have active video
    videoTrackActive,
    audioTrackActive,
    errors,
  }
}

/**
 * Cleans up a media stream by stopping all tracks
 */
export function cleanupStream(stream: MediaStream | null): void {
  if (!stream) return
  stream.getTracks().forEach((track) => {
    track.stop()
  })
}
