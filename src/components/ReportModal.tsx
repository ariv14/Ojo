'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-center mb-2">
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
              className={`w-full p-3 text-left rounded-lg border transition ${
                selectedReason === reason
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
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
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason}
            className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
