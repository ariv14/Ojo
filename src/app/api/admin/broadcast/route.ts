import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Admin Broadcast Notification API
 *
 * Sends push notifications to all active users with wallet addresses.
 * Admin-only endpoint with batching support (max 1000 addresses per API call).
 *
 * POST /api/admin/broadcast
 * {
 *   "admin_id": "nullifier_hash",
 *   "title": "Notification title (max 50 chars)",
 *   "message": "Message body (max 200 chars, supports ${username})",
 *   "mini_app_path": "/feed",  // optional deep link
 *   "dry_run": false           // optional, returns count without sending
 * }
 */

interface BroadcastRequest {
  admin_id: string
  title: string
  message: string
  mini_app_path?: string
  dry_run?: boolean
}

interface BatchResult {
  batch: number
  addresses_count: number
  success: boolean
  error?: string
}

const BATCH_SIZE = 1000
const BATCH_DELAY_MS = 100

// Helper to chunk array into batches
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

// Helper to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: Request) {
  try {
    const body: BroadcastRequest = await request.json()
    const { admin_id, title, message, mini_app_path, dry_run } = body

    // Validate admin authorization
    const adminId = process.env.NEXT_PUBLIC_ADMIN_ID
    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin not configured' },
        { status: 500 }
      )
    }

    if (!admin_id || admin_id !== adminId) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { error: 'title and message are required' },
        { status: 400 }
      )
    }

    // Validate character limits
    if (title.length > 50) {
      return NextResponse.json(
        { error: 'title must be 50 characters or less' },
        { status: 400 }
      )
    }

    if (message.length > 200) {
      return NextResponse.json(
        { error: 'message must be 200 characters or less' },
        { status: 400 }
      )
    }

    // Check for API key
    const apiKey = process.env.WORLD_API_KEY
    if (!apiKey && !dry_run) {
      console.error('WORLD_API_KEY is not set')
      return NextResponse.json(
        { error: 'Notification service not configured' },
        { status: 500 }
      )
    }

    const appId = process.env.NEXT_PUBLIC_APP_ID
    if (!appId && !dry_run) {
      console.error('NEXT_PUBLIC_APP_ID is not set')
      return NextResponse.json(
        { error: 'App ID not configured' },
        { status: 500 }
      )
    }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch all active users with wallet addresses
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('wallet_address, first_name')
      .not('wallet_address', 'is', null)
      .eq('status', 'active')

    if (fetchError) {
      console.error('Error fetching users:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Filter out any null/empty wallet addresses
    const validUsers = (users || []).filter(u => u.wallet_address && u.wallet_address.trim())

    if (validUsers.length === 0) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        total_recipients: 0,
        message: 'No users with wallet addresses found'
      })
    }

    // Dry run - return count without sending
    if (dry_run) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        total_recipients: validUsers.length,
        batch_count: Math.ceil(validUsers.length / BATCH_SIZE)
      })
    }

    // Split into batches of 1000
    const batches = chunkArray(validUsers, BATCH_SIZE)
    const results: BatchResult[] = []

    // Send notifications in batches
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const walletAddresses = batch.map(u => u.wallet_address!)

      // Build notification payload
      // Note: ${username} personalization is handled by World API automatically
      const notificationPayload = {
        app_id: appId,
        wallet_addresses: walletAddresses,
        localisations: [
          {
            language: 'en',
            title: title,
            message: message,
          },
        ],
        ...(mini_app_path && {
          mini_app_path: `worldapp://mini-app?app_id=${appId}&path=${encodeURIComponent(mini_app_path)}`,
        }),
      }

      try {
        const response = await fetch(
          'https://developer.worldcoin.org/api/v2/minikit/send-notification',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(notificationPayload),
          }
        )

        if (response.ok) {
          results.push({
            batch: i + 1,
            addresses_count: walletAddresses.length,
            success: true,
          })
        } else {
          const errorText = await response.text()
          console.error(`Batch ${i + 1} failed:`, response.status, errorText)
          results.push({
            batch: i + 1,
            addresses_count: walletAddresses.length,
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
          })
        }
      } catch (error) {
        console.error(`Batch ${i + 1} error:`, error)
        results.push({
          batch: i + 1,
          addresses_count: walletAddresses.length,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      // Delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await delay(BATCH_DELAY_MS)
      }
    }

    // Calculate summary
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const totalSent = successful.reduce((sum, r) => sum + r.addresses_count, 0)
    const totalFailed = failed.reduce((sum, r) => sum + r.addresses_count, 0)

    return NextResponse.json({
      success: failed.length === 0,
      total_recipients: validUsers.length,
      total_sent: totalSent,
      total_failed: totalFailed,
      batch_count: batches.length,
      batch_results: results,
    })

  } catch (error) {
    console.error('Broadcast error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
