'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { compressImage } from '@/utils/compress'
import { ensureWalletConnected } from '@/lib/wallet'
import ReelsCamera from '@/components/ReelsCamera'
import VideoTrimmer from '@/components/VideoTrimmer'

type MediaType = 'image' | 'album' | 'reel'

interface MediaUrl {
  key: string
  type: string
}

interface UploadPostProps {
  onClose: () => void
  onSuccess: (newPost: {
    id: string
    image_url?: string
    media_type: MediaType
    media_urls?: MediaUrl[]
    thumbnail_url?: string
    caption: string | null
    is_premium: boolean
    localBlobs?: {
      localImageUrl?: string
      localMediaUrls?: string[]
      localVideoUrl?: string
      localThumbnailUrl?: string
    }
  }) => void
}

export default function UploadPost({ onClose, onSuccess }: UploadPostProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Media type selection
  const [mediaType, setMediaType] = useState<MediaType>('image')

  // Single image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // Album state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [albumPreviews, setAlbumPreviews] = useState<string[]>([])

  // Reel state
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState<number>(0)
  const [videoThumbnail, setVideoThumbnail] = useState<Blob | null>(null)
  const [showCamera, setShowCamera] = useState(false)

  // Video trimmer state
  const [showTrimmer, setShowTrimmer] = useState(false)
  const [originalVideoFile, setOriginalVideoFile] = useState<File | null>(null)
  const [originalVideoDuration, setOriginalVideoDuration] = useState(0)

  // Common state
  const [caption, setCaption] = useState('')
  const [isPremium, setIsPremium] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [showWalletPrompt, setShowWalletPrompt] = useState(false)
  const [objectPosition, setObjectPosition] = useState<'top' | 'center' | 'bottom'>('center')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  const handleAlbumSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Filter only images
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      setError('Please select image files')
      return
    }

    // Calculate available slots based on existing selection
    const currentCount = selectedFiles.length
    const availableSlots = 10 - currentCount

    if (availableSlots <= 0) {
      setError('Maximum 10 images already selected')
      return
    }

    // Limit new files to available slots
    const limitedFiles = imageFiles.slice(0, availableSlots)
    if (imageFiles.length > availableSlots) {
      setError(`Only ${availableSlots} more image(s) can be added. Maximum is 10.`)
    } else {
      setError('')
    }

    // Append to existing files instead of replacing
    setSelectedFiles((prev) => [...prev, ...limitedFiles])
    setAlbumPreviews((prev) => [
      ...prev,
      ...limitedFiles.map((f) => URL.createObjectURL(f)),
    ])

    // Reset the input so the same file can be selected again if removed
    e.target.value = ''
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setError('Please select a video file')
      return
    }

    // Validate video duration
    const validation = await validateVideo(file)
    if (!validation.valid) {
      // Video too long - open trimmer instead of rejecting
      if (validation.error === 'needs_trim' && validation.duration > 0) {
        setOriginalVideoFile(file)
        setOriginalVideoDuration(validation.duration)
        setShowTrimmer(true)
        return
      }
      setError(validation.error || 'Invalid video')
      return
    }

    setSelectedVideo(file)
    setVideoPreview(URL.createObjectURL(file))
    setError('')

    // Extract thumbnail from first frame
    extractVideoThumbnail(file)
  }

  const validateVideo = (file: File): Promise<{ valid: boolean; error?: string; duration: number }> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'

      const timeout = setTimeout(() => {
        URL.revokeObjectURL(video.src)
        resolve({ valid: false, error: 'Video format not supported on this device', duration: 0 })
      }, 5000)

      video.onloadedmetadata = () => {
        clearTimeout(timeout)
        URL.revokeObjectURL(video.src)
        const dur = video.duration
        setVideoDuration(dur)
        if (dur > 10) {
          // Return special error code to trigger trimmer
          resolve({ valid: false, error: 'needs_trim', duration: dur })
        } else {
          resolve({ valid: true, duration: dur })
        }
      }

      video.onerror = () => {
        clearTimeout(timeout)
        URL.revokeObjectURL(video.src)
        resolve({ valid: false, error: 'Video format not supported. Try recording again.', duration: 0 })
      }

      video.src = URL.createObjectURL(file)
    })
  }

  const extractVideoThumbnail = (file: File) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    video.onloadeddata = () => {
      // Seek to first frame
      video.currentTime = 0
    }

    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              setVideoThumbnail(blob)
            }
          },
          'image/jpeg',
          0.8
        )
      }
      URL.revokeObjectURL(video.src)
    }

    video.src = URL.createObjectURL(file)
  }

  const handleCameraCapture = async (file: File, type: 'video') => {
    setShowCamera(false)

    // Check if this came from native system camera (may be longer than 10s)
    // In-app camera is already duration-limited, but native camera is not
    const validation = await validateVideo(file)
    if (!validation.valid && validation.error === 'needs_trim' && validation.duration > 0) {
      setOriginalVideoFile(file)
      setOriginalVideoDuration(validation.duration)
      setShowTrimmer(true)
      return
    }

    setSelectedVideo(file)
    setVideoPreview(URL.createObjectURL(file))
    extractVideoThumbnail(file)
    setVideoDuration(validation.duration || 10) // Use actual duration or fallback
    setError('')
  }

  const handleTrimComplete = (trimmedFile: File) => {
    setShowTrimmer(false)
    setOriginalVideoFile(null)
    setOriginalVideoDuration(0)
    setSelectedVideo(trimmedFile)
    setVideoPreview(URL.createObjectURL(trimmedFile))
    setVideoDuration(10) // Trimmed to max duration
    extractVideoThumbnail(trimmedFile)
    setError('')
  }

  const handleTrimCancel = () => {
    setShowTrimmer(false)
    setOriginalVideoFile(null)
    setOriginalVideoDuration(0)
  }

  const removeAlbumImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setAlbumPreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const reorderAlbumImages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    setSelectedFiles((prev) => {
      const newFiles = [...prev]
      const [moved] = newFiles.splice(fromIndex, 1)
      newFiles.splice(toIndex, 0, moved)
      return newFiles
    })

    setAlbumPreviews((prev) => {
      const newPreviews = [...prev]
      const [moved] = newPreviews.splice(fromIndex, 1)
      newPreviews.splice(toIndex, 0, moved)
      return newPreviews
    })
  }

  const handlePremiumToggle = async () => {
    if (isPremium) {
      setIsPremium(false)
      setShowWalletPrompt(false)
      return
    }

    const wallet = await ensureWalletConnected()
    if (wallet) {
      setIsPremium(true)
      setShowWalletPrompt(false)
    } else {
      setShowWalletPrompt(true)
    }
  }

  interface UploadResult {
    success: boolean
    error?: string
    status?: number
  }

  const uploadToS3 = async (
    presignedUrl: string,
    file: File | Blob,
    contentType: string
  ): Promise<UploadResult> => {
    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType,
        },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error(`R2 upload failed: HTTP ${response.status} - ${errorText}`)
        return { success: false, error: `Upload failed (${response.status})`, status: response.status }
      }

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      console.error('R2 upload error:', errorMessage)

      // CORS errors manifest as "Failed to fetch"
      if (errorMessage.includes('Failed to fetch')) {
        return { success: false, error: 'Storage access denied (CORS)', status: 0 }
      }

      return { success: false, error: errorMessage }
    }
  }

  const handleUpload = async () => {
    const session = getSession()
    if (!session) return

    // Validate based on media type
    if (mediaType === 'image' && !selectedFile) return
    if (mediaType === 'album' && selectedFiles.length < 2) {
      setError('Album needs at least 2 images')
      return
    }
    if (mediaType === 'reel' && !selectedVideo) return

    setIsUploading(true)
    setUploadProgress(0)
    setError('')

    try {
      const postId = crypto.randomUUID()

      if (mediaType === 'image') {
        // Single image - use existing Supabase Storage flow
        const originalSize = selectedFile!.size / 1024 / 1024
        const compressed = await compressImage(selectedFile!)
        const compressedSize = compressed.size / 1024 / 1024
        console.log(`Compressed from ${originalSize.toFixed(2)} MB to ${compressedSize.toFixed(2)} MB`)

        const fileExt = selectedFile!.name.split('.').pop()
        const fileName = `${session.nullifier_hash}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, compressed)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          setError('Failed to upload image. Please try again.')
          setIsUploading(false)
          return
        }

        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)

        const { data: postData, error: dbError } = await supabase
          .from('posts')
          .insert({
            id: postId,
            user_id: session.nullifier_hash,
            image_url: urlData.publicUrl,
            caption: caption.trim() || null,
            is_premium: isPremium,
            media_type: 'image',
          })
          .select('id')
          .single()

        if (dbError || !postData) {
          console.error('Database error:', dbError)
          setError(`Failed to save post: ${dbError?.message || 'Unknown error'}`)
          setIsUploading(false)
          return
        }

        onSuccess({
          id: postData.id,
          image_url: urlData.publicUrl,
          media_type: 'image',
          caption: caption.trim() || null,
          is_premium: isPremium,
          localBlobs: preview ? { localImageUrl: preview } : undefined,
        })
      } else if (mediaType === 'album') {
        // Album - use S3 with presigned URLs
        const files = await Promise.all(
          selectedFiles.map(async (file, index) => {
            const compressed = await compressImage(file)
            return {
              file: compressed,
              filename: file.name,
              contentType: 'image/jpeg',
              index,
            }
          })
        )

        setUploadProgress(10)

        // Get presigned URLs
        const presignedResponse = await fetch('/api/s3-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.nullifier_hash,
            postId,
            files: files.map((f) => ({
              filename: f.filename,
              contentType: f.contentType,
              index: f.index,
            })),
          }),
        })

        if (!presignedResponse.ok) {
          setError('Failed to prepare upload')
          setIsUploading(false)
          return
        }

        const { uploads } = await presignedResponse.json()

        setUploadProgress(20)

        // Upload files to S3 in parallel
        const uploadPromises = uploads.map(
          async (upload: { index: number; key: string; presignedUrl: string }, idx: number) => {
            const file = files.find((f) => f.index === upload.index)
            if (!file) return { success: false, key: upload.key, error: 'File not found' }

            const result = await uploadToS3(upload.presignedUrl, file.file, file.contentType)

            // Update progress
            setUploadProgress(20 + Math.floor(((idx + 1) / uploads.length) * 60))

            return { success: result.success, key: upload.key, error: result.error }
          }
        )

        const uploadResults = await Promise.all(uploadPromises)
        const failedUploads = uploadResults.filter((r) => !r.success)

        if (failedUploads.length > 0) {
          const firstError = failedUploads[0].error || 'Unknown error'
          const errorMsg = firstError.includes('CORS')
            ? 'Storage access denied. Please contact support.'
            : `Failed to upload ${failedUploads.length} image(s): ${firstError}`
          setError(errorMsg)
          setIsUploading(false)
          return
        }

        setUploadProgress(85)

        // Create media_urls array
        const mediaUrls: MediaUrl[] = uploads.map(
          (upload: { index: number; key: string }) => ({
            key: upload.key,
            type: 'image',
          })
        )

        // Save to database
        const { data: postData, error: dbError } = await supabase
          .from('posts')
          .insert({
            id: postId,
            user_id: session.nullifier_hash,
            caption: caption.trim() || null,
            is_premium: isPremium,
            media_type: 'album',
            media_urls: mediaUrls,
          })
          .select('id')
          .single()

        if (dbError || !postData) {
          console.error('Database error:', dbError)
          setError(`Failed to save post: ${dbError?.message || 'Unknown error'}`)
          setIsUploading(false)
          return
        }

        setUploadProgress(100)

        onSuccess({
          id: postData.id,
          media_type: 'album',
          media_urls: mediaUrls,
          caption: caption.trim() || null,
          is_premium: isPremium,
          localBlobs: albumPreviews.length > 0 ? { localMediaUrls: [...albumPreviews] } : undefined,
        })
      } else if (mediaType === 'reel') {
        // Reel - video upload to S3
        setUploadProgress(10)

        // Get presigned URLs for video and thumbnail
        const presignedResponse = await fetch('/api/s3-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.nullifier_hash,
            postId,
            files: [
              {
                filename: selectedVideo!.name,
                contentType: selectedVideo!.type,
                index: 0,
              },
            ],
            includeThumbnail: true,
          }),
        })

        if (!presignedResponse.ok) {
          setError('Failed to prepare upload')
          setIsUploading(false)
          return
        }

        const { uploads, thumbnail } = await presignedResponse.json()

        setUploadProgress(20)

        // Upload video
        const videoUpload = uploads[0]
        const videoResult = await uploadToS3(
          videoUpload.presignedUrl,
          selectedVideo!,
          selectedVideo!.type
        )

        if (!videoResult.success) {
          const errorMsg = videoResult.error?.includes('CORS')
            ? 'Storage access denied. Please contact support.'
            : `Failed to upload video: ${videoResult.error || 'Unknown error'}`
          setError(errorMsg)
          setIsUploading(false)
          return
        }

        setUploadProgress(70)

        // Upload thumbnail
        let thumbnailKey: string | null = null
        if (thumbnail && videoThumbnail) {
          const thumbResult = await uploadToS3(
            thumbnail.presignedUrl,
            videoThumbnail,
            'image/jpeg'
          )
          if (thumbResult.success) {
            thumbnailKey = thumbnail.key
          }
        }

        setUploadProgress(85)

        // Create media_urls array
        const mediaUrls: MediaUrl[] = [
          {
            key: videoUpload.key,
            type: 'video',
          },
        ]

        // Save to database
        const { data: postData, error: dbError } = await supabase
          .from('posts')
          .insert({
            id: postId,
            user_id: session.nullifier_hash,
            caption: caption.trim() || null,
            is_premium: isPremium,
            media_type: 'reel',
            media_urls: mediaUrls,
            thumbnail_url: thumbnailKey,
            duration_seconds: videoDuration,
          })
          .select('id')
          .single()

        if (dbError || !postData) {
          console.error('Database error:', dbError)
          setError(`Failed to save post: ${dbError?.message || 'Unknown error'}`)
          setIsUploading(false)
          return
        }

        setUploadProgress(100)

        onSuccess({
          id: postData.id,
          media_type: 'reel',
          media_urls: mediaUrls,
          thumbnail_url: thumbnailKey || undefined,
          caption: caption.trim() || null,
          is_premium: isPremium,
          localBlobs: videoPreview ? {
            localVideoUrl: videoPreview,
            localThumbnailUrl: videoThumbnail ? URL.createObjectURL(videoThumbnail) : undefined,
          } : undefined,
        })
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Something went wrong. Please try again.')
      setIsUploading(false)
    }
  }

  const hasContent =
    (mediaType === 'image' && selectedFile) ||
    (mediaType === 'album' && selectedFiles.length >= 2) ||
    (mediaType === 'reel' && selectedVideo)

  const resetMediaState = () => {
    // Clean up previews
    if (preview) URL.revokeObjectURL(preview)
    albumPreviews.forEach((p) => URL.revokeObjectURL(p))
    if (videoPreview) URL.revokeObjectURL(videoPreview)

    setSelectedFile(null)
    setPreview(null)
    setSelectedFiles([])
    setAlbumPreviews([])
    setSelectedVideo(null)
    setVideoPreview(null)
    setVideoDuration(0)
    setVideoThumbnail(null)
    setShowCamera(false)
    setError('')
  }

  const handleMediaTypeChange = (type: MediaType) => {
    if (type !== mediaType) {
      resetMediaState()
      setMediaType(type)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            Cancel
          </button>
          <h2 className="font-semibold">New Post</h2>
          <button
            onClick={handleUpload}
            disabled={!hasContent || isUploading}
            className="text-blue-500 font-semibold disabled:opacity-50"
          >
            {isUploading ? 'Posting...' : 'Share'}
          </button>
        </div>

        {/* Media Type Tabs */}
        <div className="flex border-b shrink-0">
          <button
            type="button"
            onClick={() => handleMediaTypeChange('image')}
            className={`flex-1 py-3 text-sm font-medium transition ${
              mediaType === 'image'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Image
          </button>
          <button
            type="button"
            onClick={() => handleMediaTypeChange('album')}
            className={`flex-1 py-3 text-sm font-medium transition ${
              mediaType === 'album'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Album
          </button>
          <button
            type="button"
            onClick={() => handleMediaTypeChange('reel')}
            className={`flex-1 py-3 text-sm font-medium transition ${
              mediaType === 'reel'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Reel
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Single Image Upload */}
          {mediaType === 'image' && (
            <>
              {preview ? (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={preview}
                        alt="Preview"
                        className={`w-full h-full object-cover ${
                          objectPosition === 'top'
                            ? 'object-top'
                            : objectPosition === 'bottom'
                            ? 'object-bottom'
                            : 'object-center'
                        }`}
                      />
                    </div>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-full p-1">
                      {(['top', 'center', 'bottom'] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setObjectPosition(pos)}
                          className={`px-3 py-1 text-xs rounded-full transition ${
                            objectPosition === pos
                              ? 'bg-white text-black'
                              : 'text-white hover:bg-white/20'
                          }`}
                        >
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Preview shows how image will appear in feed
                  </p>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition"
                >
                  <svg
                    className="w-12 h-12 text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-500">Tap to select a photo</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          )}

          {/* Album Upload */}
          {mediaType === 'album' && (
            <>
              {albumPreviews.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {albumPreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeAlbumImage(index)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                    {albumPreviews.length < 10 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition"
                      >
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {albumPreviews.length}/10 images selected. First image will be the cover.
                  </p>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition"
                >
                  <svg
                    className="w-12 h-12 text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-500 text-center">
                    Tap to select photos
                    <br />
                    <span className="text-xs text-gray-400">2-10 images</span>
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleAlbumSelect}
                className="hidden"
              />
            </>
          )}

          {/* Reel Upload */}
          {mediaType === 'reel' && (
            <>
              {showCamera ? (
                <ReelsCamera
                  onCapture={handleCameraCapture}
                  onClose={() => setShowCamera(false)}
                  onError={(error) => {
                    setError(error)
                    setShowCamera(false)
                  }}
                  maxDuration={10}
                />
              ) : videoPreview ? (
                <div className="space-y-4">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-black">
                    <video
                      src={videoPreview}
                      className="w-full h-full object-contain"
                      controls
                      muted
                      playsInline
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Duration: {videoDuration.toFixed(1)}s / 10s max
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (videoPreview) URL.revokeObjectURL(videoPreview)
                      setSelectedVideo(null)
                      setVideoPreview(null)
                      setVideoDuration(0)
                      setVideoThumbnail(null)
                    }}
                    className="w-full py-2 text-sm text-red-500 hover:text-red-600"
                  >
                    Remove and choose another
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition"
                  >
                    <svg
                      className="w-12 h-12 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-500 text-center">
                      Upload a Reel
                      <br />
                      <span className="text-xs text-gray-400">Max 10 seconds</span>
                    </p>
                  </div>

                  {/* Record Video - uses World Media API for system camera */}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        // Use World Media API to open system video camera with audio
                        const result = await (window as unknown as { world: { media: { record: (opts: { video: boolean; audio: boolean; maxDuration: number }) => Promise<{ file: Blob; mimeType: string }> } } }).world.media.record({
                          video: true,
                          audio: true,
                          maxDuration: 60
                        })

                        if (result?.file) {
                          // Convert Blob to File for our existing handler
                          const file = new File([result.file], `reel-${Date.now()}.mp4`, {
                            type: result.mimeType || 'video/mp4'
                          })
                          // Create a synthetic event for handleVideoSelect
                          const syntheticEvent = {
                            target: { files: [file] }
                          } as unknown as React.ChangeEvent<HTMLInputElement>
                          handleVideoSelect(syntheticEvent)
                        }
                      } catch (err) {
                        console.error('World video record failed:', err)
                        // Fallback to in-app camera if World API not available
                        setShowCamera(true)
                      }
                    }}
                    className="w-full py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Record Video
                  </button>

                  {/* Choose from Gallery */}
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Choose from Gallery
                  </button>
                </div>
              )}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*,android/allowCamera"
                onChange={handleVideoSelect}
                className="hidden"
              />
            </>
          )}

          {/* Caption (shown when content is selected) */}
          {hasContent && (
            <div className="mt-4 space-y-4">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                rows={3}
              />

              {/* Premium Toggle */}
              <div className="py-3 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Premium Post</p>
                    <p className="text-sm text-gray-500">Fans pay 1.0 WLD to view</p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePremiumToggle}
                    className={`w-12 h-6 rounded-full transition ${
                      isPremium ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                        isPremium ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                {showWalletPrompt && (
                  <div className="mt-2 p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-700 mb-2">Add wallet to receive payout</p>
                    <button
                      type="button"
                      onClick={handlePremiumToggle}
                      className="text-sm font-medium text-amber-600 hover:text-amber-700"
                    >
                      Connect Wallet
                    </button>
                  </div>
                )}
              </div>

              {/* Progress bar during upload */}
              {isUploading && uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
        </div>
      </div>

      {/* Video Trimmer Modal */}
      {showTrimmer && originalVideoFile && (
        <VideoTrimmer
          file={originalVideoFile}
          duration={originalVideoDuration}
          onComplete={handleTrimComplete}
          onCancel={handleTrimCancel}
          maxDuration={10}
        />
      )}
    </div>
  )
}
