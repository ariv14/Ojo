'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { hapticSuccess, hapticLight } from '@/lib/haptics'
import { sendNotification } from '@/lib/notify'
import Toast from './Toast'
import UserAvatar from './UserAvatar'
import { resolveImageUrl } from '@/lib/s3'

interface OriginalPostData {
  user_id: string
  users: {
    first_name: string
    last_name: string
    avatar_url: string | null
    wallet_address: string | null
  }
  image_url?: string
  caption: string | null
  is_premium: boolean
  media_type?: 'image' | 'album' | 'reel'
  thumbnail_url?: string
}

interface ReshareButtonProps {
  postId: string
  postUserId: string
  reshareCount: number
  userHasReshared: boolean
  originalPost: OriginalPostData
  onReshareSuccess?: () => void
}

export default function ReshareButton({
  postId,
  postUserId,
  reshareCount,
  userHasReshared,
  originalPost,
  onReshareSuccess,
}: ReshareButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [reshareComment, setReshareComment] = useState('')

  const session = getSession()
  const isOwnPost = session?.nullifier_hash === postUserId
  const canReshare = !isOwnPost && !userHasReshared

  const handleReshare = async () => {
    if (!session) return

    setIsProcessing(true)
    setError('')

    try {
      // Create a new post that references the original
      const { data: newPost, error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: session.nullifier_hash,
          original_post_id: postId,
          reshare_comment: reshareComment.trim() || null,
          caption: null,
          image_url: null,
          is_premium: false,
          is_hidden: false,
        })
        .select('id')
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          setError('You have already reshared this post')
        } else {
          console.error('Reshare error:', insertError)
          setError('Failed to reshare. Please try again.')
        }
        setIsProcessing(false)
        return
      }

      // Notify original post creator
      if (originalPost.users?.wallet_address && session.first_name) {
        sendNotification(
          [originalPost.users.wallet_address],
          'Your post was reshared!',
          `${session.first_name} reshared your post`,
          `/feed?scrollTo=${postId}`
        )
      }

      hapticSuccess()
      setShowModal(false)
      setReshareComment('')
      setShowToast(true)
      onReshareSuccess?.()
    } catch (err) {
      console.error('Reshare error:', err)
      setError('Failed to reshare. Please try again.')
    }

    setIsProcessing(false)
  }

  const handleButtonClick = () => {
    if (!canReshare) return
    hapticLight()
    setShowModal(true)
  }

  // Get preview thumbnail
  const getPreviewImage = () => {
    if (originalPost.media_type === 'reel' && originalPost.thumbnail_url) {
      return resolveImageUrl(originalPost.thumbnail_url)
    }
    if (originalPost.image_url) {
      return resolveImageUrl(originalPost.image_url)
    }
    return null
  }

  const previewImage = getPreviewImage()

  return (
    <>
      {/* Reshare Button */}
      <button
        onClick={handleButtonClick}
        disabled={!canReshare}
        className={`flex items-center gap-1 transition ${
          userHasReshared
            ? 'text-green-500'
            : canReshare
            ? 'text-gray-500 hover:text-green-500'
            : 'text-gray-300 cursor-not-allowed'
        }`}
        title={
          isOwnPost
            ? "Can't reshare your own post"
            : userHasReshared
            ? 'Already reshared'
            : 'Reshare'
        }
      >
        <svg
          className="w-6 h-6"
          fill={userHasReshared ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {reshareCount > 0 && (
          <span className="text-sm font-medium">{reshareCount}</span>
        )}
      </button>

      {/* Reshare Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-center mb-4">Reshare Post</h3>

            {/* Original post preview */}
            <div className="border rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <UserAvatar
                  avatarUrl={originalPost.users?.avatar_url}
                  firstName={originalPost.users?.first_name}
                  size="xs"
                  showStatus={false}
                />
                <span className="text-sm font-medium">
                  {originalPost.users?.first_name} {originalPost.users?.last_name}
                </span>
              </div>
              {previewImage && (
                <div className="relative w-full h-24 bg-gray-100 rounded overflow-hidden mb-2">
                  <img
                    src={previewImage}
                    alt="Post preview"
                    className={`w-full h-full object-cover ${
                      originalPost.is_premium ? 'blur-sm' : ''
                    }`}
                  />
                  {originalPost.is_premium && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4z"/>
                      </svg>
                    </div>
                  )}
                </div>
              )}
              {originalPost.caption && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {originalPost.caption}
                </p>
              )}
            </div>

            {/* Comment field */}
            <div className="mb-4">
              <textarea
                value={reshareComment}
                onChange={(e) => setReshareComment(e.target.value)}
                placeholder="Add your thoughts... (optional)"
                className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-black focus:border-transparent outline-none text-sm"
                rows={2}
                maxLength={280}
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {reshareComment.length}/280
              </p>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setReshareComment('')
                  setError('')
                }}
                disabled={isProcessing}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReshare}
                disabled={isProcessing}
                className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
              >
                {isProcessing ? 'Resharing...' : 'Reshare'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showToast && (
        <Toast message="Post reshared!" onClose={() => setShowToast(false)} />
      )}
    </>
  )
}
