'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { hapticLight } from '@/lib/haptics'
import UserAvatar from './UserAvatar'

interface CommentInputProps {
  postId: string
  parentCommentId?: string | null
  replyToName?: string | null
  onSubmit?: (comment: {
    id: string
    content: string
    user_id: string
    parent_comment_id: string | null
  }) => void
  onCancelReply?: () => void
  autoFocus?: boolean
}

export default function CommentInput({
  postId,
  parentCommentId = null,
  replyToName = null,
  onSubmit,
  onCancelReply,
  autoFocus = false,
}: CommentInputProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const session = getSession()

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus, parentCommentId])

  useEffect(() => {
    if (replyToName) {
      setContent(`@${replyToName} `)
      inputRef.current?.focus()
    }
  }, [replyToName])

  const handleSubmit = async () => {
    if (!session || !content.trim() || isSubmitting) return

    hapticLight()
    setIsSubmitting(true)

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: session.nullifier_hash,
        parent_comment_id: parentCommentId,
        content: content.trim(),
      })
      .select('id, content, user_id, parent_comment_id')
      .single()

    if (!error && data) {
      onSubmit?.(data)
      setContent('')
      if (onCancelReply) onCancelReply()
    }

    setIsSubmitting(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape' && onCancelReply) {
      onCancelReply()
    }
  }

  if (!session) return null

  return (
    <div className="flex gap-2 items-start">
      <UserAvatar
        avatarUrl={session.avatar_url}
        firstName={session.first_name}
        size="xs"
        showStatus={false}
      />
      <div className="flex-1 relative">
        {replyToName && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">
              Replying to {replyToName}
            </span>
            <button
              onClick={onCancelReply}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyToName ? 'Write a reply...' : 'Add a comment...'}
            className="flex-1 p-2 border rounded-lg resize-none focus:ring-2 focus:ring-black focus:border-transparent outline-none text-sm"
            rows={1}
            maxLength={50}
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="px-3 py-2 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition"
          >
            {isSubmitting ? '...' : 'Post'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {content.length}/50
        </p>
      </div>
    </div>
  )
}
