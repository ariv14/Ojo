'use client'

import { Share2, Copy, Twitter, MessageCircle, Check } from 'lucide-react'
import { useState } from 'react'

export default function ShareTab() {
  const [copied, setCopied] = useState(false)
  const referralLink = 'https://ojo.world/join' // Placeholder

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join OJO',
          text: 'Join the social network for verified humans! Claim daily OJO rewards.',
          url: referralLink,
        })
      } catch {
        // User cancelled or share failed
      }
    }
  }

  return (
    <div className="px-4 py-8 max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--oro-cyan)] to-[var(--oro-purple)] flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Share2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Share OJO</h2>
        <p className="text-gray-500">
          Invite friends to join the verified human network
        </p>
      </div>

      {/* Referral Link */}
      <div className="card-oro p-5 mb-6">
        <label className="text-sm font-medium text-gray-500 mb-2 block">
          Your Referral Link
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 text-sm text-gray-700 font-mono truncate">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className={`p-3 rounded-lg transition-all ${
              copied
                ? 'bg-green-100 text-green-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {copied ? (
              <Check className="w-5 h-5" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="space-y-3">
        <button
          onClick={handleShare}
          className="w-full btn-oro-3d py-4 flex items-center justify-center gap-3"
        >
          <Share2 className="w-5 h-5" />
          <span>Share</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=Join%20OJO%2C%20the%20social%20network%20for%20verified%20humans!&url=${encodeURIComponent(referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-full bg-black text-white font-semibold hover:bg-gray-800 transition-colors"
          >
            <Twitter className="w-4 h-4" />
            <span>Twitter</span>
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent('Join OJO, the social network for verified humans! ' + referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-full bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Coming Soon Badge */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
          <span>Referral rewards coming soon</span>
        </div>
      </div>
    </div>
  )
}
