'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MiniKit,
  tokenToDecimals,
  Tokens,
  PayCommandInput,
} from '@worldcoin/minikit-js'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { ensureWalletConnected } from '@/lib/wallet'

interface ChatButtonProps {
  targetUserAddress: string
}

export default function ChatButton({ targetUserAddress }: ChatButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleChat = async () => {
    const session = getSession()
    if (!session) return

    // Don't show chat button for own posts
    if (session.nullifier_hash === targetUserAddress) return

    setIsLoading(true)

    try {
      // Check if connection already exists (either direction)
      const { data: existingConnection } = await supabase
        .from('connections')
        .select('id, status')
        .or(
          `and(initiator_id.eq.${session.nullifier_hash},receiver_id.eq.${targetUserAddress}),` +
          `and(initiator_id.eq.${targetUserAddress},receiver_id.eq.${session.nullifier_hash})`
        )
        .single()

      if (existingConnection?.status === 'active') {
        // Already connected, go to chat
        router.push(`/chat/${existingConnection.id}`)
        return
      }

      // Check if user already paid for chat unlock (prevent double billing)
      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('sender_id', session.nullifier_hash)
        .eq('receiver_id', targetUserAddress)
        .eq('type', 'chat_unlock')
        .single()

      if (existingTransaction) {
        // Already paid - create/activate connection without payment
        const { data: newConnection, error } = await supabase
          .from('connections')
          .upsert({
            initiator_id: session.nullifier_hash,
            receiver_id: targetUserAddress,
            status: 'active',
          }, { onConflict: 'initiator_id,receiver_id' })
          .select('id')
          .single()

        if (!error && newConnection) {
          router.push(`/chat/${newConnection.id}`)
        }
        return
      }

      if (!MiniKit.isInstalled()) {
        alert('Please open this app in World App')
        setIsLoading(false)
        return
      }

      // Ensure user has wallet connected before payment
      const walletAddress = await ensureWalletConnected()
      if (!walletAddress) {
        setIsLoading(false)
        return
      }

      // Generate unique reference for payment (max 36 chars)
      const reference = `chat_${Date.now()}`

      const payload: PayCommandInput = {
        reference,
        to: process.env.NEXT_PUBLIC_OWNER_WALLET!,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(1, Tokens.WLD).toString(),
          },
        ],
        description: 'Unlock chat with this user',
      }

      const { finalPayload } = await MiniKit.commandsAsync.pay(payload)

      if (finalPayload.status === 'success') {
        // Record transaction to prevent future double billing
        const { error: txError } = await supabase.from('transactions').insert({
          sender_id: session.nullifier_hash,
          receiver_id: targetUserAddress,
          type: 'chat_unlock',
          amount: 1.0,
          reference,
        })

        if (txError) {
          console.error('Error recording transaction:', txError.message, txError.code, txError.details)
        }

        // Insert connection record
        const { data: newConnection, error } = await supabase
          .from('connections')
          .upsert({
            initiator_id: session.nullifier_hash,
            receiver_id: targetUserAddress,
            status: 'active',
          }, { onConflict: 'initiator_id,receiver_id' })
          .select('id')
          .single()

        if (error) {
          console.error('Error creating connection:', error.message, error.code, error.details)
          alert('Payment successful but failed to create connection. Please contact support.')
        } else {
          router.push(`/chat/${newConnection.id}`)
        }
      } else {
        console.error('Payment failed:', finalPayload)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const session = getSession()

  // Don't render for own posts
  if (session?.nullifier_hash === targetUserAddress) {
    return null
  }

  return (
    <button
      onClick={handleChat}
      disabled={isLoading}
      className="text-sm text-blue-500 font-medium disabled:opacity-50"
    >
      {isLoading ? '...' : 'Chat'}
    </button>
  )
}
