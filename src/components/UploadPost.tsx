'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { compressImage } from '@/utils/compress'
import { ensureWalletConnected } from '@/lib/wallet'

interface UploadPostProps {
  onClose: () => void
  onSuccess: () => void
}

export default function UploadPost({ onClose, onSuccess }: UploadPostProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [isPremium, setIsPremium] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
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

  const handlePremiumToggle = async () => {
    if (isPremium) {
      // Turning off premium - always allowed
      setIsPremium(false)
      setShowWalletPrompt(false)
      return
    }

    // Turning on premium - check for wallet
    const wallet = await ensureWalletConnected()
    if (wallet) {
      setIsPremium(true)
      setShowWalletPrompt(false)
    } else {
      // User declined wallet connection
      setShowWalletPrompt(true)
    }
  }

  const handleUpload = async () => {
    const session = getSession()
    if (!session || !selectedFile) return

    setIsUploading(true)
    setError('')

    try {
      // Compress image before upload
      const originalSize = selectedFile.size / 1024 / 1024
      const compressed = await compressImage(selectedFile)
      const compressedSize = compressed.size / 1024 / 1024
      console.log(`Compressed from ${originalSize.toFixed(2)} MB to ${compressedSize.toFixed(2)} MB`)

      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${session.nullifier_hash}-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, compressed)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        setError('Failed to upload image. Please try again.')
        setIsUploading(false)
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName)

      // Save post to database
      const { error: dbError } = await supabase.from('posts').insert({
        user_id: session.nullifier_hash,
        image_url: urlData.publicUrl,
        caption: caption.trim() || null,
        is_premium: isPremium,
      })

      if (dbError) {
        console.error('Database error:', dbError)
        console.error('Error details:', JSON.stringify(dbError, null, 2))
        console.error('Error message:', dbError.message)
        console.error('Error code:', dbError.code)
        setError(`Failed to save post: ${dbError.message || 'Unknown error'}`)
        setIsUploading(false)
        return
      }

      onSuccess()
    } catch (err) {
      console.error('Error:', err)
      setError('Something went wrong. Please try again.')
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <h2 className="font-semibold">New Post</h2>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="text-blue-500 font-semibold disabled:opacity-50"
          >
            {isUploading ? 'Posting...' : 'Share'}
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {preview ? (
            <div className="space-y-4">
              {/* Square Preview - shows how image will appear in feed */}
              <div className="relative">
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={preview}
                    alt="Preview"
                    className={`w-full h-full object-cover ${
                      objectPosition === 'top' ? 'object-top' :
                      objectPosition === 'bottom' ? 'object-bottom' : 'object-center'
                    }`}
                  />
                </div>
                {/* Position Controls */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-full p-1">
                  <button
                    type="button"
                    onClick={() => setObjectPosition('top')}
                    className={`px-3 py-1 text-xs rounded-full transition ${
                      objectPosition === 'top' ? 'bg-white text-black' : 'text-white hover:bg-white/20'
                    }`}
                  >
                    Top
                  </button>
                  <button
                    type="button"
                    onClick={() => setObjectPosition('center')}
                    className={`px-3 py-1 text-xs rounded-full transition ${
                      objectPosition === 'center' ? 'bg-white text-black' : 'text-white hover:bg-white/20'
                    }`}
                  >
                    Center
                  </button>
                  <button
                    type="button"
                    onClick={() => setObjectPosition('bottom')}
                    className={`px-3 py-1 text-xs rounded-full transition ${
                      objectPosition === 'bottom' ? 'bg-white text-black' : 'text-white hover:bg-white/20'
                    }`}
                  >
                    Bottom
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">Preview shows how image will appear in feed (square crop)</p>
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

          {error && (
            <p className="text-red-500 text-sm text-center mt-4">{error}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    </div>
  )
}
