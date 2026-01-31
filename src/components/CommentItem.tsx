'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { useRouter } from 'next/navigation'
import { ThumbsUp, ThumbsDown, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { hapticLight } from '@/lib/haptics'
import UserAvatar from './UserAvatar'

const REPLIES_PER_PAGE = 3

export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_comment_id: string | null
  content: string
  created_at: string
  updated_at: string
  users: {
    username?: string
    first_name?: string
    last_name?: string
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
  const [visibleRepliesCount, setVisibleRepliesCount] = useState(REPLIES_PER_PAGE)
  const menuRef = useRef<HTMLDivElement>(null)

  // Sync local vote state when props change
  useEffect(() => {
    setLikeCount(comment.like_count)
    setDislikeCount(comment.dislike_count)
    setUserVote(comment.user_vote)
  }, [comment.like_count, comment.dislike_count, comment.user_vote])

  // Reset visible replies count when comment changes
  useEffect(() => {
    setVisibleRepliesCount(REPLIES_PER_PAGE)
  }, [comment.id])

  // Close menu when tapping outside
  useEffect(() => {
    if (!showMenu) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchend', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchend', handleClickOutside)
    }
  }, [showMenu])

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
            username={comment.users?.username || comment.users?.first_name}
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
                {comment.users?.username || `${comment.users?.first_name || ''} ${comment.users?.last_name || ''}`.trim() || 'Anonymous'}
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
                className={`flex items-center gap-1 text-xs transition-colors ${
                  userVote === 'like' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" fill={userVote === 'like' ? 'currentColor' : 'none'} />
                {likeCount > 0 && <span>{likeCount}</span>}
              </button>

              {/* Dislike */}
              <button
                onClick={() => handleVote('dislike')}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  userVote === 'dislike' ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" fill={userVote === 'dislike' ? 'currentColor' : 'none'} />
                {dislikeCount > 0 && <span>{dislikeCount}</span>}
              </button>

              {/* Reply */}
              {!isReply && onReply && (
                <button
                  onClick={() => onReply(comment.id, comment.users?.username || comment.users?.first_name || 'User')}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Reply
                </button>
              )}

              {/* Menu for own comments */}
              {isOwnComment && (
                <div className="relative ml-auto" ref={menuRef}>
                  <button
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowMenu(!showMenu)
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(!showMenu)
                    }}
                    className="text-gray-400 hover:text-gray-600 p-2 -m-1 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 bottom-full mb-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[140px] animate-scale-in">
                      <button
                        onTouchEnd={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowMenu(false)
                          setIsEditing(true)
                        }}
                        onClick={() => {
                          setShowMenu(false)
                          setIsEditing(true)
                        }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2.5 text-gray-700"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onTouchEnd={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDelete()
                        }}
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-gray-50 active:bg-red-50 disabled:opacity-50 flex items-center gap-2.5"
                      >
                        <Trash2 className="w-4 h-4" />
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
              {comment.replies.slice(0, visibleRepliesCount).map((reply) => (
                <MemoizedCommentItem
                  key={reply.id}
                  comment={reply}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  isReply
                />
              ))}
              {comment.replies.length > visibleRepliesCount && (
                <button
                  onClick={() => setVisibleRepliesCount(prev => prev + REPLIES_PER_PAGE)}
                  className="ml-8 mt-2 text-xs text-blue-500 hover:text-blue-600"
                >
                  View {Math.min(REPLIES_PER_PAGE, comment.replies.length - visibleRepliesCount)} more {comment.replies.length - visibleRepliesCount === 1 ? 'reply' : 'replies'}
                </button>
              )}
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
