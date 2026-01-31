'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HelpCircle, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import Header from '@/components/Header'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

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

  const getStatusVariant = (status: string): 'warning' | 'info' | 'success' | 'default' => {
    switch (status) {
      case 'open': return 'warning'
      case 'in_progress': return 'info'
      case 'resolved': return 'success'
      default: return 'default'
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
      <div className="min-h-screen bg-gray-50 pt-14">
        <Header showBackButton title="Support" />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
          <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-14">
      <Header
        showBackButton
        onBack={() => router.back()}
        title="Support"
        rightContent={
          <Button
            size="sm"
            onClick={() => setShowNewTicket(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Ticket
          </Button>
        }
      />

      {/* Tickets List */}
      <div className="w-full md:max-w-2xl mx-auto p-4">
        {tickets.length === 0 ? (
          <div className="bg-white rounded-xl">
            <EmptyState
              icon={<HelpCircle className="w-7 h-7" />}
              title="No support tickets"
              description="Need help? Create a ticket and we'll get back to you."
              action={
                <Button size="sm" onClick={() => setShowNewTicket(true)}>
                  Create your first ticket
                </Button>
              }
            />
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
                  <Badge variant={getStatusVariant(ticket.status)} size="sm">
                    {getStatusLabel(ticket.status)}
                  </Badge>
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
      <Modal isOpen={showNewTicket} onClose={() => { setShowNewTicket(false); setSubject(''); setMessage(''); setError('') }} className="max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-center mb-4">New Support Ticket</h3>

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
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm transition-all"
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
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none resize-none text-sm transition-all"
                maxLength={1000}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center mt-4">{error}</p>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => { setShowNewTicket(false); setSubject(''); setMessage(''); setError('') }}
              disabled={isSubmitting}
              className="flex-1"
              size="lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitTicket}
              disabled={!subject.trim() || !message.trim()}
              isLoading={isSubmitting}
              className="flex-1"
              size="lg"
            >
              Submit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal isOpen={!!selectedTicket} onClose={() => { setSelectedTicket(null); setUserReply('') }} className="max-w-md max-h-[90vh] overflow-y-auto">
        {selectedTicket && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Ticket Details</h3>
              <Badge variant={getStatusVariant(selectedTicket.status)} size="md">
                {getStatusLabel(selectedTicket.status)}
              </Badge>
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
              <Button
                variant="outline"
                onClick={() => { setSelectedTicket(null); setUserReply('') }}
                disabled={isReplying}
                className="flex-1"
                size="lg"
              >
                Close
              </Button>
              {selectedTicket.admin_response && selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                <Button
                  onClick={handleUserReply}
                  disabled={!userReply.trim()}
                  isLoading={isReplying}
                  className="flex-1"
                  size="lg"
                >
                  Send Reply
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
