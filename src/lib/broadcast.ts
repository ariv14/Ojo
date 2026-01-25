/**
 * Client-side broadcast notification helper for the admin panel
 */

export interface BroadcastOptions {
  title: string
  message: string
  mini_app_path?: string
}

export interface BroadcastResult {
  success: boolean
  total_recipients: number
  total_sent?: number
  total_failed?: number
  batch_count?: number
  batch_results?: Array<{
    batch: number
    addresses_count: number
    success: boolean
    error?: string
  }>
  error?: string
  dry_run?: boolean
  message?: string
}

/**
 * Send a broadcast notification to all active users
 * Requires admin authorization
 */
export async function sendBroadcast(
  adminId: string,
  options: BroadcastOptions
): Promise<BroadcastResult> {
  try {
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_id: adminId,
        title: options.title,
        message: options.message,
        mini_app_path: options.mini_app_path,
        dry_run: false,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return {
        success: false,
        total_recipients: 0,
        error: data.error || 'Failed to send broadcast',
      }
    }

    return data
  } catch (error) {
    return {
      success: false,
      total_recipients: 0,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Preview broadcast recipient count without sending
 * Useful for confirming before sending to all users
 */
export async function previewBroadcast(
  adminId: string,
  options: BroadcastOptions
): Promise<BroadcastResult> {
  try {
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_id: adminId,
        title: options.title,
        message: options.message,
        mini_app_path: options.mini_app_path,
        dry_run: true,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return {
        success: false,
        total_recipients: 0,
        error: data.error || 'Failed to preview broadcast',
      }
    }

    return data
  } catch (error) {
    return {
      success: false,
      total_recipients: 0,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}
