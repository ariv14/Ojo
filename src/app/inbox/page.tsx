'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

interface ChatRequest {
  id: string
  initiator_id: string
  created_at: string
  users: {
    first_name: string
    last_name: string
  }
}

export default function InboxPage() {
  const router = useRouter()
  const [chats, setChats] = useState<ChatRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const session = getSession()

  useEffect(() => {
    if (!session) {
      router.push('/')
      return
    }
    fetchIncomingChats()

    // Subscribe to new connections (both as receiver and initiator)
    const channel = supabase
      .channel('inbox')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connections',
        },
        (payload) => {
          // Refetch if user is involved in the connection
          const newConn = payload.new as { initiator_id: string; receiver_id: string }
          if (newConn.initiator_id === session.nullifier_hash ||
              newConn.receiver_id === session.nullifier_hash) {
            fetchIncomingChats()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, session])

  const fetchIncomingChats = async () => {
    if (!session) return

    // Fetch connections where user is receiver (chats initiated with me)
    const { data: receivedChats, error: error1 } = await supabase
      .from('connections')
      .select('id, initiator_id, receiver_id, created_at')
      .eq('receiver_id', session.nullifier_hash)
      .eq('status', 'active')

    // Fetch connections where user is initiator (chats I started)
    const { data: initiatedChats, error: error2 } = await supabase
      .from('connections')
      .select('id, initiator_id, receiver_id, created_at')
      .eq('initiator_id', session.nullifier_hash)
      .eq('status', 'active')

    if (error1 || error2) {
      console.error('Error fetching chats:', error1 || error2)
      setIsLoading(false)
      return
    }

    // Combine and deduplicate by "other user" (not connection ID)
    // This handles bidirectional connections (A→B and B→A) as one conversation
    const allChats = [...(receivedChats || []), ...(initiatedChats || [])]
    const uniqueChats = allChats.filter((chat, index, self) => {
      const otherUserId = chat.initiator_id === session.nullifier_hash
        ? chat.receiver_id
        : chat.initiator_id
      return index === self.findIndex(c => {
        const otherId = c.initiator_id === session.nullifier_hash
          ? c.receiver_id
          : c.initiator_id
        return otherId === otherUserId
      })
    })

    // Get the "other user" id for each chat
    const otherUserIds = uniqueChats.map(chat =>
      chat.initiator_id === session.nullifier_hash ? chat.receiver_id : chat.initiator_id
    )

    // Fetch user details
    const { data: users } = await supabase
      .from('users')
      .select('nullifier_hash, first_name, last_name')
      .in('nullifier_hash', otherUserIds)

    const userMap = new Map(users?.map(u => [u.nullifier_hash, u]) || [])

    // Map chats with user data
    const chatsWithUsers = uniqueChats.map(chat => {
      const otherUserId = chat.initiator_id === session.nullifier_hash
        ? chat.receiver_id
        : chat.initiator_id
      const otherUser = userMap.get(otherUserId)
      return {
        id: chat.id,
        initiator_id: chat.initiator_id,
        created_at: chat.created_at,
        users: otherUser || { first_name: 'Unknown', last_name: '' }
      }
    })

    // Sort by created_at descending
    chatsWithUsers.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    setChats(chatsWithUsers as unknown as ChatRequest[])
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/feed')}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-semibold text-lg">Inbox</h1>
        </div>
      </header>

      {/* Chat List */}
      <main className="max-w-lg mx-auto">
        {chats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No messages yet
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => router.push(`/chat/${chat.id}`)}
              className="w-full px-4 py-3 flex items-center gap-3 bg-white border-b border-gray-100 hover:bg-gray-50 transition text-left"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                {chat.users?.first_name?.[0] || '?'}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {chat.users?.first_name} {chat.users?.last_name}
                </p>
                <p className="text-sm text-gray-500">
                  Started a chat with you
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(chat.created_at).toLocaleDateString()}
              </span>
            </button>
          ))
        )}
      </main>
    </div>
  )
}
