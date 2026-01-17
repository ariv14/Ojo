import { MiniKit } from '@worldcoin/minikit-js'
import { supabase } from './supabase'
import { getSession } from './session'

/**
 * Ensures the user has a wallet connected before proceeding with payment.
 * If no wallet is connected, prompts the user to connect one via MiniKit.
 * Returns the wallet address if successful, or null if the user cancels.
 */
export async function ensureWalletConnected(): Promise<string | null> {
  const session = getSession()
  if (!session) return null

  // Check if user already has a wallet
  const { data: user } = await supabase
    .from('users')
    .select('wallet_address')
    .eq('nullifier_hash', session.nullifier_hash)
    .single()

  if (user?.wallet_address) {
    return user.wallet_address
  }

  // No wallet - prompt to connect
  if (!MiniKit.isInstalled()) {
    alert('Please open this app in World App')
    return null
  }

  try {
    const nonce = crypto.randomUUID().replace(/-/g, '')
    const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
      nonce,
    })

    if (finalPayload.status === 'success') {
      const walletAddress = finalPayload.address

      // Save wallet to database
      const { error } = await supabase
        .from('users')
        .update({ wallet_address: walletAddress })
        .eq('nullifier_hash', session.nullifier_hash)

      if (error) {
        console.error('Error saving wallet:', error)
        return null
      }

      return walletAddress
    }
  } catch (err) {
    console.error('Wallet auth error:', err)
  }

  return null
}
