'use client'

import { AlertCircle, Trash2, Loader2 } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  confirmColor?: 'red' | 'blue' | 'green'
  isLoading?: boolean
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmColor = 'red',
  isLoading = false,
}: ConfirmationModalProps) {
  const iconColor = {
    red: 'text-red-500 bg-red-50',
    blue: 'text-blue-500 bg-blue-50',
    green: 'text-green-500 bg-green-50',
  }

  const buttonVariant = confirmColor === 'red' ? 'danger' : 'primary'

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <div className="flex justify-center mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconColor[confirmColor]}`}>
            {confirmColor === 'red' ? (
              <Trash2 className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
          </div>
        </div>
        <h3 className="text-lg font-semibold text-center mb-1">{title}</h3>
        <p className="text-gray-500 text-center text-sm mb-6">{message}</p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
            size="lg"
          >
            Cancel
          </Button>
          <Button
            variant={buttonVariant}
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1"
            size="lg"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
