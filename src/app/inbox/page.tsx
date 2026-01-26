'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import Header from '@/components/Header'

interface InboxChat {
  connection_id: string
  other_user_id: string
  other_username: string | null
  other_first_name: string | null
  other_last_name: string | null
  created_at: string
  unread_count: number
}

export default function InboxPage() {
  const router = useRouter()
  const [chats, setChats] = useState<InboxChat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const session = getSession()
  // Track known other_user_ids to avoid duplicates from realtime
  const knownUsersRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!session) {
      router.push('/')
      return
    }
    fetchInboxChats()

    // Subscribe to new connections and new messages
    const channel = supabase
      .channel('inbox')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connections',
        },
        async (payload) => {
          // Check if user is involved in the connection
          const newConn = payload.new as { id: string; initiator_id: string; receiver_id: string; status: string; created_at: string }
          if (newConn.status !== 'active') return

          const isInvolved = newConn.initiator_id === session.nullifier_hash ||
                            newConn.receiver_id === session.nullifier_hash
          if (!isInvolved) return

          // Determine the other user
          const otherUserId = newConn.initiator_id === session.nullifier_hash
            ? newConn.receiver_id
            : newConn.initiator_id

          // Skip if we already have a chat with this user
          if (knownUsersRef.current.has(otherUserId)) return

          // Incrementally add the new chat instead of full refetch
          const { data: otherUser } = await supabase
            .from('users')
            .select('username, first_name, last_name')
            .eq('nullifier_hash', otherUserId)
            .single()

          if (otherUser) {
            knownUsersRef.current.add(otherUserId)
            const newChat: InboxChat = {
              connection_id: newConn.id,
              other_user_id: otherUserId,
              other_username: otherUser.username,
              other_first_name: otherUser.first_name,
              other_last_name: otherUser.last_name,
              created_at: newConn.created_at,
              unread_count: 0,
            }
            // Add to beginning (newest first)
            setChats(prev => [newChat, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as { connection_id: string; sender_id: string }
          // Only increment if message is from someone else (not the current user)
          if (newMsg.sender_id === session.nullifier_hash) return

          // Increment unread count for this connection
          setChats(prev => prev.map(chat =>
            chat.connection_id === newMsg.connection_id
              ? { ...chat, unread_count: chat.unread_count + 1 }
              : chat
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, session])

  // Use RPC function for single-query fetch with built-in deduplication and sorting
  const fetchInboxChats = async () => {
    if (!session) return

    const { data, error } = await supabase.rpc('get_inbox_chats', {
      p_user_id: session.nullifier_hash,
    })

    if (error) {
      console.error('Error fetching inbox:', error)
      setIsLoading(false)
      return
    }

    // Get connection IDs to fetch unread counts
    const connectionIds = (data || []).map((chat: { connection_id: string }) => chat.connection_id)

    // Fetch unread message counts for all connections
    const { data: unreadData } = await supabase
      .from('messages')
      .select('connection_id')
      .in('connection_id', connectionIds)
      .neq('sender_id', session.nullifier_hash)
      .eq('is_read', false)

    // Count unread messages per connection
    const unreadCounts: Record<string, number> = {}
    ;(unreadData || []).forEach((msg: { connection_id: string }) => {
      unreadCounts[msg.connection_id] = (unreadCounts[msg.connection_id] || 0) + 1
    })

    // Map RPC results to our interface
    const inboxChats: InboxChat[] = (data || []).map((chat: {
      connection_id: string
      other_user_id: string
      other_username?: string
      other_first_name?: string
      other_last_name?: string
      created_at: string
    }) => ({
      connection_id: chat.connection_id,
      other_user_id: chat.other_user_id,
      other_username: chat.other_username || null,
      other_first_name: chat.other_first_name || null,
      other_last_name: chat.other_last_name || null,
      created_at: chat.created_at,
      unread_count: unreadCounts[chat.connection_id] || 0,
    }))

    // Sort by created_at descending (RPC returns DISTINCT ON order, need to re-sort)
    inboxChats.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Populate known users set for realtime dedup
    knownUsersRef.current = new Set(inboxChats.map(c => c.other_user_id))

    setChats(inboxChats)
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-14">
      {/* Header */}
      <Header showBackButton />

      {/* Chat List */}
      <main className="w-full md:max-w-2xl mx-auto">
        {chats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No messages yet
          </div>
        ) : (
          chats.map((chat) => {
            const displayName = chat.other_username || `${chat.other_first_name || ''} ${chat.other_last_name || ''}`.trim() || 'Unknown'
            return (
            <button
              key={chat.connection_id}
              onClick={() => router.push(`/chat/${chat.connection_id}`)}
              className="w-full px-4 py-3 flex items-center gap-3 bg-white border-b border-gray-100 hover:bg-gray-50 transition text-left"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                {displayName[0] || '?'}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {displayName}
                </p>
                <p className="text-sm text-gray-500">
                  Started a chat with you
                </p>
              </div>
              <div className="flex items-center gap-2">
                {chat.unread_count > 0 && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {chat.unread_count > 99 ? '99+' : chat.unread_count}
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {new Date(chat.created_at).toLocaleDateString()}
                </span>
              </div>
            </button>
            )
          })
        )}
      </main>
    </div>
  )
}
