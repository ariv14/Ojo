'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { hapticLight } from '@/lib/haptics'

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  is_edited?: boolean
  users: {
    first_name: string
  }
}

const MESSAGES_PER_PAGE = 50

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const connectionId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockedBy, setBlockedBy] = useState<string | null>(null)
  const [userClearedAt, setUserClearedAt] = useState<string | null>(null)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const userClearedAtRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  // Cache user names to avoid DB queries on realtime messages
  const userCacheRef = useRef<Map<string, string>>(new Map())
  const session = getSession()

  // Keep ref in sync with state for realtime callback access
  useEffect(() => {
    userClearedAtRef.current = userClearedAt
  }, [userClearedAt])

  useEffect(() => {
    if (!session) {
      router.push('/')
      return
    }

    fetchMessagesAndConnection()

    // Set up realtime subscription
    const channel = supabase
      .channel(`messages:${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          // Check if message is after user's cleared_at
          const clearedAt = userClearedAtRef.current
          if (clearedAt && payload.new.created_at <= clearedAt) {
            return // Don't show messages from before user cleared
          }

          // Use cached user name instead of querying DB
          const senderId = payload.new.sender_id as string
          const cachedName = userCacheRef.current.get(senderId) || 'User'

          const newMsg: Message = {
            id: payload.new.id as string,
            sender_id: senderId,
            content: payload.new.content as string,
            created_at: payload.new.created_at as string,
            is_edited: payload.new.is_edited as boolean || false,
            users: { first_name: cachedName },
          }

          setMessages((prev) => [...prev, newMsg])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [connectionId, router, session])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = () => {
      setMenuMessageId(null)
      setShowSettings(false)
    }
    if (menuMessageId || showSettings) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [menuMessageId, showSettings])

  // Combined fetch for connection data and messages (avoids duplicate queries)
  const fetchMessagesAndConnection = async () => {
    if (!session) return

    // Single query for all connection data (combines two separate queries)
    const { data: connData } = await supabase
      .from('connections')
      .select('initiator_id, receiver_id, initiator_cleared_at, receiver_cleared_at, is_blocked, blocked_by')
      .eq('id', connectionId)
      .single()

    let clearedAt: string | null = null
    if (connData) {
      const isInitiator = connData.initiator_id === session.nullifier_hash
      clearedAt = isInitiator ? connData.initiator_cleared_at : connData.receiver_cleared_at
      setUserClearedAt(clearedAt)
      setIsBlocked(connData.is_blocked || false)
      setBlockedBy(connData.blocked_by || null)

      // Cache the other user's info for realtime messages
      const otherUserId = isInitiator ? connData.receiver_id : connData.initiator_id
      const { data: otherUser } = await supabase
        .from('users')
        .select('first_name')
        .eq('nullifier_hash', otherUserId)
        .single()
      if (otherUser) {
        userCacheRef.current.set(otherUserId, otherUser.first_name)
      }

      // Cache current user's name too
      if (session.first_name) {
        userCacheRef.current.set(session.nullifier_hash, session.first_name)
      }
    }

    // Fetch messages with pagination (most recent MESSAGES_PER_PAGE)
    let query = supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        content,
        created_at,
        is_edited,
        users (
          first_name
        )
      `)
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PER_PAGE)

    // Filter out messages before user's cleared_at
    if (clearedAt) {
      query = query.gt('created_at', clearedAt)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching messages:', error)
    } else {
      // Reverse to show oldest first, then newest at bottom
      const orderedMessages = (data as unknown as Message[]).reverse()
      setMessages(orderedMessages)
      setHasMoreMessages(data.length === MESSAGES_PER_PAGE)

      // Cache all fetched user names
      orderedMessages.forEach(msg => {
        if (msg.users?.first_name) {
          userCacheRef.current.set(msg.sender_id, msg.users.first_name)
        }
      })
    }
    setIsLoading(false)
  }

  // Load older messages when scrolling up
  const loadMoreMessages = useCallback(async () => {
    if (!session || isLoadingMore || !hasMoreMessages || messages.length === 0) return

    setIsLoadingMore(true)
    const oldestMessage = messages[0]

    let query = supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        content,
        created_at,
        is_edited,
        users (
          first_name
        )
      `)
      .eq('connection_id', connectionId)
      .lt('created_at', oldestMessage.created_at)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PER_PAGE)

    if (userClearedAt) {
      query = query.gt('created_at', userClearedAt)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading more messages:', error)
    } else if (data) {
      const olderMessages = (data as unknown as Message[]).reverse()
      setMessages(prev => [...olderMessages, ...prev])
      setHasMoreMessages(data.length === MESSAGES_PER_PAGE)

      // Cache user names
      olderMessages.forEach(msg => {
        if (msg.users?.first_name) {
          userCacheRef.current.set(msg.sender_id, msg.users.first_name)
        }
      })
    }
    setIsLoadingMore(false)
  }, [connectionId, messages, hasMoreMessages, isLoadingMore, session, userClearedAt])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !session || isSending) return

    if (isBlocked) {
      return
    }

    // Haptic feedback when sending
    hapticLight()

    setIsSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    // Send the message
    const { error } = await supabase.from('messages').insert({
      connection_id: connectionId,
      sender_id: session.nullifier_hash,
      content: messageContent,
    })

    if (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageContent) // Restore message on error
    }
    setIsSending(false)
  }

  const handleDeleteMessage = async (messageId: string) => {
    setMenuMessageId(null)
    await supabase.from('messages').delete().eq('id', messageId)
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }

  const handleStartEdit = (message: Message) => {
    setMenuMessageId(null)
    setEditingMessageId(message.id)
    setEditContent(message.content)
  }

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return

    await supabase
      .from('messages')
      .update({ content: editContent.trim(), is_edited: true })
      .eq('id', editingMessageId)

    setMessages(prev => prev.map(m =>
      m.id === editingMessageId
        ? { ...m, content: editContent.trim(), is_edited: true }
        : m
    ))
    setEditingMessageId(null)
    setEditContent('')
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  const handleBlockUser = async () => {
    setShowSettings(false)
    await supabase
      .from('connections')
      .update({ is_blocked: true, blocked_by: session?.nullifier_hash })
      .eq('id', connectionId)
    setIsBlocked(true)
    setBlockedBy(session?.nullifier_hash || null)
  }

  const handleUnblockUser = async () => {
    setShowSettings(false)
    await supabase
      .from('connections')
      .update({ is_blocked: false, blocked_by: null })
      .eq('id', connectionId)
    setIsBlocked(false)
    setBlockedBy(null)
  }

  const handleClearChat = async () => {
    setShowSettings(false)
    if (!session) return

    // Fetch connection to determine user's role
    const { data: connData } = await supabase
      .from('connections')
      .select('initiator_id')
      .eq('id', connectionId)
      .single()

    if (!connData) return

    // Determine which column to update based on user's role
    const isInitiator = connData.initiator_id === session.nullifier_hash
    const clearedAtColumn = isInitiator ? 'initiator_cleared_at' : 'receiver_cleared_at'
    const now = new Date().toISOString()

    // Update user's cleared_at timestamp instead of deleting messages
    await supabase
      .from('connections')
      .update({ [clearedAtColumn]: now })
      .eq('id', connectionId)

    // Update local state
    setUserClearedAt(now)
    setMessages([])
  }

  const handleDeleteConversation = async () => {
    setShowSettings(false)
    await supabase.rpc('delete_conversation', {
      p_connection_id: connectionId,
      p_user_id: session?.nullifier_hash
    })
    router.push('/inbox')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading chat...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 animated-gradient-header text-white z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/feed')}
            className="text-white/80 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-semibold flex-1">Chat</h1>

          {/* Settings Button */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-white/80 hover:text-white p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showSettings && (
              <div
                className="absolute right-0 top-full mt-1 bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden z-20"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleClearChat}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 text-gray-700"
                >
                  Clear Chat
                </button>
                <button
                  onClick={handleDeleteConversation}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 text-red-600"
                >
                  Delete Conversation
                </button>
                {isBlocked && blockedBy === session?.nullifier_hash ? (
                  <button
                    onClick={handleUnblockUser}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 text-green-600"
                  >
                    Unblock User
                  </button>
                ) : (
                  <button
                    onClick={handleBlockUser}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 text-red-600"
                  >
                    Block User
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Blocked Banner */}
      {isBlocked && (
        <div className="bg-red-50 text-red-600 text-center py-2 text-sm">
          {blockedBy === session?.nullifier_hash
            ? 'You blocked this user'
            : 'You have been blocked'}
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          {/* Load More Button */}
          {hasMoreMessages && messages.length > 0 && (
            <button
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="w-full py-2 text-sm text-blue-500 font-medium hover:bg-blue-50 rounded-lg disabled:opacity-50 transition"
            >
              {isLoadingMore ? 'Loading...' : 'Load older messages'}
            </button>
          )}

          {messages.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              No messages yet. Say hello!
            </p>
          ) : (
            messages.map((message) => {
              const isMe = message.sender_id === session?.nullifier_hash
              const isEditing = editingMessageId === message.id
              return (
                <div
                  key={message.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="relative">
                    <div
                      onClick={() => isMe && !isEditing && setMenuMessageId(menuMessageId === message.id ? null : message.id)}
                      className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                        isMe
                          ? 'bg-blue-500 text-white rounded-br-md cursor-pointer'
                          : 'bg-gray-200 text-gray-900 rounded-bl-md'
                      }`}
                    >
                      {!isMe && (
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {message.users?.first_name}
                        </p>
                      )}
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit()
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                            className="text-sm bg-white text-gray-900 px-2 py-1 rounded outline-none"
                            autoFocus
                          />
                          <div className="flex gap-2 text-xs">
                            <button onClick={handleSaveEdit} className="underline">Save</button>
                            <button onClick={handleCancelEdit} className="underline opacity-70">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm">{message.content}</p>
                          {message.is_edited && (
                            <p className={`text-xs mt-1 ${isMe ? 'opacity-60' : 'opacity-50'}`}>Edited</p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Context Menu */}
                    {menuMessageId === message.id && isMe && (
                      <div
                        className="absolute right-0 bottom-full mb-1 bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleStartEdit(message)}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 text-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="sticky bottom-0 bg-white border-t border-gray-200">
        <form
          onSubmit={handleSend}
          className="max-w-lg mx-auto px-4 py-3 flex gap-2"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isBlocked ? "This conversation is blocked" : "Type a message..."}
            disabled={isBlocked}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending || isBlocked}
            className="bg-blue-500 text-white px-4 py-2 rounded-full font-medium disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  )
}
