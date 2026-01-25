'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { sendNotification } from '@/lib/notify'
import CommentItem, { Comment } from './CommentItem'
import CommentInput from './CommentInput'

interface CommentSectionProps {
  postId: string
  postUserId: string
  postUserWallet?: string | null
  isExpanded: boolean
  onToggle: () => void
  commentCount: number
  onCommentCountChange?: (delta: number) => void
}

export default function CommentSection({
  postId,
  postUserId,
  postUserWallet,
  isExpanded,
  onToggle,
  commentCount,
  onCommentCountChange,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(null)
  const session = getSession()

  const fetchComments = useCallback(async () => {
    if (!isExpanded) return

    setIsLoading(true)

    // Fetch comments with user data and votes
    const { data: commentsData, error } = await supabase
      .from('comments')
      .select(`
        id,
        post_id,
        user_id,
        parent_comment_id,
        content,
        created_at,
        updated_at,
        users (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      setIsLoading(false)
      return
    }

    if (!commentsData || commentsData.length === 0) {
      setComments([])
      setIsLoading(false)
      return
    }

    // Fetch all votes for these comments
    const commentIds = commentsData.map(c => c.id)
    const [allVotesRes, userVotesRes] = await Promise.all([
      supabase
        .from('comment_votes')
        .select('comment_id, vote_type')
        .in('comment_id', commentIds),
      session
        ? supabase
            .from('comment_votes')
            .select('comment_id, vote_type')
            .eq('user_id', session.nullifier_hash)
            .in('comment_id', commentIds)
        : Promise.resolve({ data: [] }),
    ])

    // Calculate vote counts
    const voteCounts: Record<string, { likes: number; dislikes: number }> = {}
    commentIds.forEach(id => {
      voteCounts[id] = { likes: 0, dislikes: 0 }
    })
    allVotesRes.data?.forEach(v => {
      if (v.vote_type === 'like') voteCounts[v.comment_id].likes++
      else voteCounts[v.comment_id].dislikes++
    })

    // Map user votes
    const userVotesMap: Record<string, 'like' | 'dislike'> = {}
    userVotesRes.data?.forEach(v => {
      userVotesMap[v.comment_id] = v.vote_type as 'like' | 'dislike'
    })

    // Transform data and organize into tree structure
    const commentsMap = new Map<string, Comment>()
    const rootComments: Comment[] = []

    commentsData.forEach(c => {
      // Handle Supabase returning users as array or object
      const usersData = Array.isArray(c.users) ? c.users[0] : c.users
      const comment: Comment = {
        id: c.id,
        post_id: c.post_id,
        user_id: c.user_id,
        parent_comment_id: c.parent_comment_id,
        content: c.content,
        created_at: c.created_at,
        updated_at: c.updated_at,
        users: usersData as Comment['users'],
        like_count: voteCounts[c.id]?.likes || 0,
        dislike_count: voteCounts[c.id]?.dislikes || 0,
        user_vote: userVotesMap[c.id] || null,
        replies: [],
      }
      commentsMap.set(c.id, comment)
    })

    // Build tree structure
    commentsMap.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = commentsMap.get(comment.parent_comment_id)
        if (parent) {
          parent.replies = parent.replies || []
          parent.replies.push(comment)
        }
      } else {
        rootComments.push(comment)
      }
    })

    setComments(rootComments)
    setIsLoading(false)
  }, [postId, isExpanded, session])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleNewComment = async (newComment: {
    id: string
    content: string
    user_id: string
    parent_comment_id: string | null
  }) => {
    if (!session) return

    // Create the full comment object for local state
    const fullComment: Comment = {
      id: newComment.id,
      post_id: postId,
      user_id: newComment.user_id,
      parent_comment_id: newComment.parent_comment_id,
      content: newComment.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      users: {
        first_name: session.first_name || '',
        last_name: session.last_name || '',
        avatar_url: session.avatar_url || null,
      },
      like_count: 0,
      dislike_count: 0,
      user_vote: null,
      replies: [],
    }

    if (newComment.parent_comment_id) {
      // Add as reply to parent
      setComments(prev => prev.map(c => {
        if (c.id === newComment.parent_comment_id) {
          return {
            ...c,
            replies: [...(c.replies || []), fullComment],
          }
        }
        return c
      }))

      // Notify parent comment author
      const parentComment = comments.find(c => c.id === newComment.parent_comment_id)
      if (parentComment && parentComment.user_id !== session.nullifier_hash) {
        const { data: parentUser } = await supabase
          .from('users')
          .select('wallet_address')
          .eq('nullifier_hash', parentComment.user_id)
          .single()

        if (parentUser?.wallet_address && session.first_name) {
          sendNotification(
            [parentUser.wallet_address],
            'New reply to your comment',
            `${session.first_name} replied to your comment`,
            `/feed?scrollTo=${postId}`
          )
        }
      }
    } else {
      // Add as root comment
      setComments(prev => [...prev, fullComment])

      // Notify post author
      if (postUserId !== session.nullifier_hash && postUserWallet && session.first_name) {
        sendNotification(
          [postUserWallet],
          'New comment on your post',
          `${session.first_name} commented on your post`,
          `/feed?scrollTo=${postId}`
        )
      }
    }

    onCommentCountChange?.(1)
    setReplyingTo(null)
  }

  const handleDeleteComment = (commentId: string) => {
    // Remove from local state (handles both root and replies)
    setComments(prev => {
      // Try to remove from root level
      const filtered = prev.filter(c => c.id !== commentId)
      if (filtered.length < prev.length) {
        onCommentCountChange?.(-1)
        return filtered
      }

      // Try to remove from replies
      return prev.map(c => {
        if (c.replies?.some(r => r.id === commentId)) {
          onCommentCountChange?.(-1)
          return {
            ...c,
            replies: c.replies.filter(r => r.id !== commentId),
          }
        }
        return c
      })
    })
  }

  const handleUpdateComment = (commentId: string, newContent: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, content: newContent, updated_at: new Date().toISOString() }
      }
      if (c.replies?.some(r => r.id === commentId)) {
        return {
          ...c,
          replies: c.replies.map(r =>
            r.id === commentId
              ? { ...r, content: newContent, updated_at: new Date().toISOString() }
              : r
          ),
        }
      }
      return c
    }))
  }

  const handleReply = (commentId: string, authorName: string) => {
    setReplyingTo({ commentId, authorName })
  }

  return (
    <div className="border-t">
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {commentCount === 0
          ? 'Add a comment'
          : `${commentCount} comment${commentCount === 1 ? '' : 's'}`}
      </button>

      {/* Comments section */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Comment input */}
          <div className="mb-4">
            <CommentInput
              postId={postId}
              parentCommentId={replyingTo?.commentId || null}
              replyToName={replyingTo?.authorName || null}
              onSubmit={handleNewComment}
              onCancelReply={() => setReplyingTo(null)}
              autoFocus={!!replyingTo}
            />
          </div>

          {/* Comments list */}
          {isLoading ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">
              No comments yet. Be the first!
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onDelete={handleDeleteComment}
                  onUpdate={handleUpdateComment}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
