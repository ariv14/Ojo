'use client'

import { useState } from 'react'
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from '@worldcoin/minikit-js'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { ensureWalletConnected } from '@/lib/wallet'
import { hapticSuccess, hapticError } from '@/lib/haptics'
import { sendNotification } from '@/lib/notify'
import { Gift } from 'lucide-react'
import Toast from './Toast'
import Modal from './ui/Modal'
import Button from './ui/Button'

// Tip amounts with 20% owner commission
const TIP_AMOUNT = 0.5
const OWNER_COMMISSION_RATE = 0.2
const CREATOR_SHARE = TIP_AMOUNT * (1 - OWNER_COMMISSION_RATE) // 0.4 WLD
const OWNER_SHARE = TIP_AMOUNT * OWNER_COMMISSION_RATE // 0.1 WLD

interface TipButtonProps {
  postId: string
  authorAddress: string
  authorWalletAddress?: string | null
  authorName: string
  onTipSuccess?: () => void
}

export default function TipButton({ postId, authorAddress, authorWalletAddress, authorName, onTipSuccess }: TipButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0) // 0 = not started, 1 = platform fee, 2 = creator payment
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)

  const canTip = !!authorWalletAddress

  // Helper to add delay between payments
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const handleTip = async () => {
    const session = getSession()
    if (!session) return

    // Don't allow self-tipping
    if (session.nullifier_hash === authorAddress) return

    if (!authorWalletAddress) {
      setError('Creator wallet not found')
      return
    }

    // Ensure user has wallet connected before payment
    const myWallet = await ensureWalletConnected()
    if (!myWallet) {
      return
    }

    setIsProcessing(true)
    setCurrentStep(1)
    setError('')

    try {
      // Step 1: Pay platform fee to owner (0.1 WLD)
      const ownerReference = crypto.randomUUID().replace(/-/g, '').slice(0, 36)
      const ownerPayload: PayCommandInput = {
        reference: ownerReference,
        to: process.env.NEXT_PUBLIC_OWNER_WALLET!,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(OWNER_SHARE, Tokens.WLD).toString(),
          },
        ],
        description: 'Platform fee',
      }

      const { finalPayload: ownerPayment } = await MiniKit.commandsAsync.pay(ownerPayload)

      if (ownerPayment.status !== 'success') {
        setError('Platform fee payment was not completed')
        setIsProcessing(false)
        setCurrentStep(0)
        return
      }

      // Add delay before second payment to allow World App to process
      await delay(1500)
      setCurrentStep(2)

      // Step 2: Pay creator directly (0.4 WLD)
      const creatorReference = crypto.randomUUID().replace(/-/g, '').slice(0, 36)
      const creatorPayload: PayCommandInput = {
        reference: creatorReference,
        to: authorWalletAddress,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(CREATOR_SHARE, Tokens.WLD).toString(),
          },
        ],
        description: `Tip for ${authorName}`,
      }

      const { finalPayload: creatorPayment } = await MiniKit.commandsAsync.pay(creatorPayload)

      if (creatorPayment.status !== 'success') {
        // Owner got paid but creator didn't - still record as partial success
        console.warn('Creator payment failed, but platform fee was paid')
        setError('Creator payment failed. Platform fee was collected.')
      }

      // Record tip in database
      const { error: insertError } = await supabase.from('tips').insert({
        from_user_id: session.nullifier_hash,
        to_user_id: authorAddress,
        to_wallet_address: authorWalletAddress,
        post_id: postId,
        amount: TIP_AMOUNT,
        creator_share: CREATOR_SHARE,
        owner_share: OWNER_SHARE,
        transaction_hash: creatorReference,
        payout_status: creatorPayment.status === 'success' ? 'paid' : 'failed',
      })

      if (insertError) {
        console.error('Error inserting tip:', insertError.message, insertError.code, insertError.details)
      } else {
        console.log('Tip recorded successfully')
      }

      if (creatorPayment.status === 'success') {
        // Notify creator of tip
        if (authorWalletAddress && session.first_name) {
          sendNotification(
            [authorWalletAddress],
            'You received a tip!',
            `${session.first_name} tipped you ${TIP_AMOUNT} WLD`,
            `/feed?scrollTo=${postId}`
          )
        }

        // Haptic feedback for successful tip
        hapticSuccess()
        setShowModal(false)
        setShowToast(true)
        onTipSuccess?.()
      }
    } catch (err) {
      console.error('Tip error:', err)
      hapticError()
      setError('Payment failed. Please try again.')
    }

    setIsProcessing(false)
    setCurrentStep(0)
  }

  return (
    <>
      {/* Tip Button */}
      <button
        onClick={() => setShowModal(true)}
        disabled={!canTip}
        className={`flex items-center gap-1 transition-colors ${
          canTip ? 'text-gray-500 hover:text-amber-500' : 'text-gray-300 cursor-not-allowed'
        }`}
        title={canTip ? 'Send a tip' : 'Enable wallet to receive tips'}
      >
        <Gift className="w-5 h-5" />
      </button>

      {/* Confirmation Modal */}
      <Modal isOpen={showModal} onClose={() => !isProcessing && setShowModal(false)}>
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Gift className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-center mb-1">Send a Tip</h3>
          <p className="text-[var(--text-secondary)] text-center text-sm mb-4">
            Tip @{authorName} for their post
          </p>

          {/* Breakdown */}
          <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 mb-4 text-sm">
            <div className={`flex justify-between mb-1 ${currentStep === 1 ? 'text-amber-600 font-medium' : ''}`}>
              <span className={currentStep === 1 ? 'text-amber-600' : 'text-[var(--text-secondary)]'}>
                1. Platform fee {currentStep === 1 && '...'}
              </span>
              <span className={currentStep === 1 ? 'text-amber-600' : 'text-[var(--text-tertiary)]'}>{OWNER_SHARE} WLD</span>
            </div>
            <div className={`flex justify-between mb-1 ${currentStep === 2 ? 'text-amber-600 font-medium' : ''}`}>
              <span className={currentStep === 2 ? 'text-amber-600' : 'text-[var(--text-secondary)]'}>
                2. Creator receives {currentStep === 2 && '...'}
              </span>
              <span className={currentStep === 2 ? 'text-amber-600' : 'font-medium text-[var(--text-primary)]'}>{CREATOR_SHARE} WLD</span>
            </div>
            <div className="border-t border-[var(--border)] pt-1 mt-1 flex justify-between font-medium">
              <span>Total (2 transactions)</span>
              <span>{TIP_AMOUNT} WLD</span>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={isProcessing}
              className="flex-1"
              size="lg"
            >
              Cancel
            </Button>
            <button
              onClick={handleTip}
              disabled={isProcessing}
              className="flex-1 h-12 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition disabled:opacity-50"
            >
              {isProcessing
                ? currentStep === 1
                  ? 'Processing 1/2...'
                  : 'Processing 2/2...'
                : `Send ${TIP_AMOUNT} WLD`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Success Toast */}
      {showToast && (
        <Toast message="Tip sent!" onClose={() => setShowToast(false)} />
      )}
    </>
  )
}
