/**
 * Client-side notification helper for sending push notifications via the /api/notify endpoint
 */

export async function sendNotification(
  walletAddresses: string[],
  title: string,
  message: string,
  miniAppPath?: string
): Promise<boolean> {
  // Skip if no valid wallet addresses
  if (!walletAddresses.length || walletAddresses.some(w => !w)) return false

  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_addresses: walletAddresses,
        title,
        message,
        mini_app_path: miniAppPath,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
