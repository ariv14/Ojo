'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import Modal from './ui/Modal'
import Button from './ui/Button'

interface ReportModalProps {
  targetId: string
  targetType: 'post' | 'user'
  targetName?: string
  onClose: () => void
  onSuccess?: () => void
}

const REPORT_REASONS = {
  post: [
    'Spam or misleading',
    'Inappropriate content',
    'Harassment or bullying',
    'Violence or dangerous content',
    'Copyright violation',
    'Other',
  ],
  user: [
    'Fake profile',
    'Spam or scam',
    'Harassment or bullying',
    'Impersonation',
    'Inappropriate behavior',
    'Other',
  ],
}

export default function ReportModal({ targetId, targetType, targetName, onClose, onSuccess }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const reasons = REPORT_REASONS[targetType]

  const handleSubmit = async () => {
    const session = getSession()
    if (!session || !selectedReason) return

    setIsSubmitting(true)
    setError('')

    const { error: insertError } = await supabase.from('reports').insert({
      reporter_id: session.nullifier_hash,
      target_id: targetId,
      target_type: targetType,
      reason: selectedReason,
    })

    if (insertError) {
      console.error('Error submitting report:', insertError.message, insertError.code, insertError.details)
      setError('Failed to submit report. Please try again.')
      setIsSubmitting(false)
      return
    }

    onSuccess?.()
    onClose()
  }

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="p-6">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <Flag className="w-6 h-6 text-red-500" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-center mb-1">
          Report {targetType === 'post' ? 'Post' : 'User'}
        </h3>
        {targetName && (
          <p className="text-gray-500 text-center text-sm mb-4">
            {targetType === 'user' ? `@${targetName}` : ''}
          </p>
        )}

        <div className="space-y-2 mb-6">
          {reasons.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelectedReason(reason)}
              className={`w-full p-3 text-left rounded-lg border text-sm transition-all duration-150 ${
                selectedReason === reason
                  ? 'border-red-500 bg-red-50 text-red-700 font-medium'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
            size="lg"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={!selectedReason}
            isLoading={isSubmitting}
            className="flex-1"
            size="lg"
          >
            Report
          </Button>
        </div>
      </div>
    </Modal>
  )
}
