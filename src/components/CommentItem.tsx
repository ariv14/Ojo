'use client'

import { useState, useEffect, memo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { hapticLight } from '@/lib/haptics'
import UserAvatar from './UserAvatar'

export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_comment_id: string | null
  content: string
  created_at: string
  updated_at: string
  users: {
    first_name: string
    last_name: string
    avatar_url: string | null
  }
  like_count: number
  dislike_count: number
  user_vote: 'like' | 'dislike' | null
  replies?: Comment[]
}

interface CommentItemProps {
  comment: Comment
  onReply?: (commentId: string, authorName: string) => void
  onDelete?: (commentId: string) => void
  onUpdate?: (commentId: string, newContent: string) => void
  isReply?: boolean
}

function CommentItem({
  comment,
  onReply,
  onDelete,
  onUpdate,
  isReply = false,
}: CommentItemProps) {
  const router = useRouter()
  const session = getSession()
  const isOwnComment = session?.nullifier_hash === comment.user_id

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [likeCount, setLikeCount] = useState(comment.like_count)
  const [dislikeCount, setDislikeCount] = useState(comment.dislike_count)
  const [userVote, setUserVote] = useState(comment.user_vote)
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync local vote state when props change
  useEffect(() => {
    setLikeCount(comment.like_count)
    setDislikeCount(comment.dislike_count)
    setUserVote(comment.user_vote)
  }, [comment.like_count, comment.dislike_count, comment.user_vote])

  const handleVote = async (voteType: 'like' | 'dislike') => {
    if (!session) return

    hapticLight()

    // Optimistic update
    if (userVote === voteType) {
      // Remove vote
      setUserVote(null)
      if (voteType === 'like') setLikeCount(prev => prev - 1)
      else setDislikeCount(prev => prev - 1)
    } else {
      // Add or switch vote
      if (userVote === 'like') setLikeCount(prev => prev - 1)
      else if (userVote === 'dislike') setDislikeCount(prev => prev - 1)

      setUserVote(voteType)
      if (voteType === 'like') setLikeCount(prev => prev + 1)
      else setDislikeCount(prev => prev + 1)
    }

    // Persist to database
    if (userVote === voteType) {
      await supabase
        .from('comment_votes')
        .delete()
        .eq('comment_id', comment.id)
        .eq('user_id', session.nullifier_hash)
    } else {
      await supabase
        .from('comment_votes')
        .upsert({
          comment_id: comment.id,
          user_id: session.nullifier_hash,
          vote_type: voteType,
        }, { onConflict: 'comment_id,user_id' })
    }
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === comment.content) {
      setIsEditing(false)
      setEditContent(comment.content)
      return
    }

    const { error } = await supabase
      .from('comments')
      .update({
        content: editContent.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', comment.id)
      .eq('user_id', session?.nullifier_hash)

    if (!error) {
      onUpdate?.(comment.id, editContent.trim())
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!session || isDeleting) return

    setIsDeleting(true)
    setShowMenu(false)

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', comment.id)
      .eq('user_id', session.nullifier_hash)

    if (!error) {
      onDelete?.(comment.id)
    }

    setIsDeleting(false)
  }

  const timeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
    return date.toLocaleDateString()
  }

  const wasEdited = comment.updated_at !== comment.created_at

  return (
    <div className={`${isReply ? 'ml-8 mt-2' : ''}`}>
      <div className="flex gap-2">
        {/* Avatar */}
        <button onClick={() => router.push(`/profile/${comment.user_id}`)}>
          <UserAvatar
            avatarUrl={comment.users?.avatar_url}
            firstName={comment.users?.first_name}
            size="xs"
            showStatus={false}
          />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-gray-100 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/profile/${comment.user_id}`)}
                className="font-medium text-sm hover:underline"
              >
                {comment.users?.first_name} {comment.users?.last_name}
              </button>
              <span className="text-xs text-gray-400">
                {timeAgo(comment.created_at)}
                {wasEdited && ' (edited)'}
              </span>
            </div>

            {isEditing ? (
              <div className="mt-1">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2 border rounded text-sm resize-none focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                  rows={2}
                  maxLength={50}
                  autoFocus
                />
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleSaveEdit}
                    className="text-xs px-2 py-1 bg-black text-white rounded hover:bg-gray-800"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditContent(comment.content)
                    }}
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            )}
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-1 px-1">
              {/* Like */}
              <button
                onClick={() => handleVote('like')}
                className={`flex items-center gap-1 text-xs ${
                  userVote === 'like' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill={userVote === 'like' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                {likeCount > 0 && <span>{likeCount}</span>}
              </button>

              {/* Dislike */}
              <button
                onClick={() => handleVote('dislike')}
                className={`flex items-center gap-1 text-xs ${
                  userVote === 'dislike' ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill={userVote === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
                {dislikeCount > 0 && <span>{dislikeCount}</span>}
              </button>

              {/* Reply */}
              {!isReply && onReply && (
                <button
                  onClick={() => onReply(comment.id, comment.users?.first_name || 'User')}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Reply
                </button>
              )}

              {/* Menu for own comments */}
              {isOwnComment && (
                <div className="relative ml-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(!showMenu)
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="6" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="18" r="1.5" />
                    </svg>
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border py-1 z-10 min-w-[100px]">
                      <button
                        onClick={() => {
                          setShowMenu(false)
                          setIsEditing(true)
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="w-full px-3 py-1.5 text-left text-sm text-red-500 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => (
                <MemoizedCommentItem
                  key={reply.id}
                  comment={reply}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const MemoizedCommentItem = memo(CommentItem, (prevProps, nextProps) => {
  return (
    prevProps.comment.id === nextProps.comment.id &&
    prevProps.comment.content === nextProps.comment.content &&
    prevProps.comment.like_count === nextProps.comment.like_count &&
    prevProps.comment.dislike_count === nextProps.comment.dislike_count &&
    prevProps.comment.user_vote === nextProps.comment.user_vote &&
    prevProps.comment.replies?.length === nextProps.comment.replies?.length &&
    prevProps.isReply === nextProps.isReply
  )
})

export default MemoizedCommentItem
