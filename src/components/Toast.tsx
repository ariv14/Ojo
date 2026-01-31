'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info } from 'lucide-react'

interface ToastProps {
  message: string
  onClose: () => void
  duration?: number
  variant?: 'success' | 'error' | 'info'
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const iconColorMap = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
}

export default function Toast({ message, onClose, duration = 3000, variant = 'success' }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const Icon = iconMap[variant]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="flex items-center gap-2.5 bg-white px-5 py-3 rounded-xl shadow-[var(--shadow-lg)] border border-gray-100">
          <Icon className={`w-5 h-5 flex-shrink-0 ${iconColorMap[variant]}`} />
          <span className="text-sm font-medium text-gray-900">{message}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
