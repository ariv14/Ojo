'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

interface Ticket {
  id: string
  subject: string
  message: string
  status: string
  admin_response: string | null
  user_response: string | null
  created_at: string
}

export default function SupportPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [userReply, setUserReply] = useState('')
  const [isReplying, setIsReplying] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.push('/')
      return
    }

    const fetchTickets = async () => {
      // Fire-and-forget cleanup of tickets older than 30 days (don't block page load)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      supabase
        .from('support_tickets')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString())
        .then(() => {}) // Suppress unhandled promise warning

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', session.nullifier_hash)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching tickets:', error.message)
      } else {
        setTickets(data || [])
      }
      setIsLoading(false)
    }

    fetchTickets()
  }, [router])

  const handleSubmitTicket = async () => {
    const session = getSession()
    if (!session || !subject.trim() || !message.trim()) return

    setIsSubmitting(true)
    setError('')

    const { data, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: session.nullifier_hash,
        subject: subject.trim(),
        message: message.trim(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating ticket:', insertError.message, insertError.code)
      setError('Failed to submit ticket. Please try again.')
      setIsSubmitting(false)
      return
    }

    setTickets(prev => [data, ...prev])
    setShowNewTicket(false)
    setSubject('')
    setMessage('')
    setIsSubmitting(false)
  }

  const handleUserReply = async () => {
    if (!selectedTicket || !userReply.trim()) return

    setIsReplying(true)

    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({ user_response: userReply.trim() })
      .eq('id', selectedTicket.id)

    if (updateError) {
      console.error('Error updating ticket:', updateError.message)
      setIsReplying(false)
      return
    }

    setTickets(prev => prev.map(t =>
      t.id === selectedTicket.id ? { ...t, user_response: userReply.trim() } : t
    ))
    setSelectedTicket(null)
    setUserReply('')
    setIsReplying(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-600'
      case 'in_progress':
        return 'bg-blue-100 text-blue-600'
      case 'resolved':
        return 'bg-green-100 text-green-600'
      case 'closed':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Open'
      case 'in_progress':
        return 'In Progress'
      case 'resolved':
        return 'Resolved'
      case 'closed':
        return 'Closed'
      default:
        return status
    }
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
      <div className="bg-white border-b">
        <div className="w-full md:max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Support</h1>
          </div>
          <button
            onClick={() => setShowNewTicket(true)}
            className="px-4 py-2 bg-black text-white text-sm rounded-lg font-medium hover:bg-gray-800 transition"
          >
            New Ticket
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="w-full md:max-w-2xl mx-auto p-4">
        {tickets.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 mb-4">No support tickets yet</p>
            <button
              onClick={() => setShowNewTicket(true)}
              className="text-blue-500 font-medium"
            >
              Create your first ticket
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white rounded-xl p-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => {
                  setSelectedTicket(ticket)
                  setUserReply(ticket.user_response || '')
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium flex-1 pr-2">{ticket.subject}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${getStatusColor(ticket.status)}`}>
                    {getStatusLabel(ticket.status)}
                  </span>
                </div>
                <p className="text-gray-500 text-sm mb-2 line-clamp-2">{ticket.message}</p>

                {/* Admin Response indicator */}
                {ticket.admin_response && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">Admin replied</span>
                    {ticket.user_response && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">You replied</span>
                    )}
                  </div>
                )}

                <p className="text-gray-400 text-xs mt-2">
                  {new Date(ticket.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-center mb-4">New Support Ticket</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none"
                  maxLength={1000}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center mt-4">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewTicket(false)
                  setSubject('')
                  setMessage('')
                  setError('')
                }}
                disabled={isSubmitting}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTicket}
                disabled={isSubmitting || !subject.trim() || !message.trim()}
                className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Ticket Details</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedTicket.status)}`}>
                {getStatusLabel(selectedTicket.status)}
              </span>
            </div>

            <div className="space-y-4">
              {/* Subject */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Subject</p>
                <p className="font-medium">{selectedTicket.subject}</p>
              </div>

              {/* Your Message */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Your Message</p>
                <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>

              {/* Admin Response */}
              {selectedTicket.admin_response && (
                <div>
                  <p className="text-xs text-blue-600 mb-1">Admin Response</p>
                  <p className="text-gray-700 bg-blue-50 p-3 rounded border border-blue-100 whitespace-pre-wrap">
                    {selectedTicket.admin_response}
                  </p>
                </div>
              )}

              {/* User Reply - only show if admin has responded and ticket not resolved */}
              {selectedTicket.admin_response && selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Your Reply</label>
                  <textarea
                    value={userReply}
                    onChange={(e) => setUserReply(e.target.value)}
                    placeholder="Write your reply..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none"
                    maxLength={1000}
                  />
                </div>
              )}

              {/* Show existing user reply if ticket is resolved */}
              {selectedTicket.user_response && (selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Your Reply</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{selectedTicket.user_response}</p>
                </div>
              )}

              {/* Date */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Submitted</p>
                <p className="text-sm text-gray-600">
                  {new Date(selectedTicket.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedTicket(null)
                  setUserReply('')
                }}
                disabled={isReplying}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Close
              </button>
              {selectedTicket.admin_response && selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                <button
                  onClick={handleUserReply}
                  disabled={isReplying || !userReply.trim()}
                  className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReplying ? 'Sending...' : 'Send Reply'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
