import { NextResponse } from 'next/server'

/**
 * Push Notification API Route
 *
 * Sends push notifications to users via World App's notification service.
 *
 * Usage:
 * POST /api/notify
 * {
 *   "wallet_addresses": ["0x123..."],
 *   "title": "New follower!",
 *   "message": "Someone followed you",
 *   "mini_app_path": "/feed" // optional deep link
 * }
 *
 * Environment variables required:
 * - WORLD_API_KEY: API key from World Developer Portal
 * - NEXT_PUBLIC_APP_ID: Your mini app ID
 */

interface NotifyRequest {
  wallet_addresses: string[]
  title: string
  message: string
  mini_app_path?: string
}

export async function POST(request: Request) {
  try {
    const body: NotifyRequest = await request.json()
    const { wallet_addresses, title, message, mini_app_path } = body

    // Validate required fields
    if (!wallet_addresses || !Array.isArray(wallet_addresses) || wallet_addresses.length === 0) {
      return NextResponse.json(
        { error: 'wallet_addresses is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!title || !message) {
      return NextResponse.json(
        { error: 'title and message are required' },
        { status: 400 }
      )
    }

    // Check for API key
    const apiKey = process.env.WORLD_API_KEY
    if (!apiKey) {
      console.error('WORLD_API_KEY is not set')
      return NextResponse.json(
        { error: 'Notification service not configured' },
        { status: 500 }
      )
    }

    const appId = process.env.NEXT_PUBLIC_APP_ID
    if (!appId) {
      console.error('NEXT_PUBLIC_APP_ID is not set')
      return NextResponse.json(
        { error: 'App ID not configured' },
        { status: 500 }
      )
    }

    // Build notification payload
    const notificationPayload = {
      app_id: appId,
      wallet_addresses: wallet_addresses,
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

    // Send notification via World API
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

    if (!response.ok) {
      const errorText = await response.text()
      console.error('World API notification error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to send notification', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json({ success: true, result })

  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to send notifications from server-side code
 * Can be used in database triggers or other API routes
 */
export async function sendNotification(
  walletAddresses: string[],
  title: string,
  message: string,
  miniAppPath?: string
): Promise<boolean> {
  const apiKey = process.env.WORLD_API_KEY
  const appId = process.env.NEXT_PUBLIC_APP_ID

  if (!apiKey || !appId) {
    console.error('Notification service not configured')
    return false
  }

  if (walletAddresses.length === 0) {
    console.warn('No wallet addresses provided for notification')
    return false
  }

  try {
    const notificationPayload = {
      app_id: appId,
      wallet_addresses: walletAddresses,
      localisations: [
        {
          language: 'en',
          title,
          message,
        },
      ],
      ...(miniAppPath && {
        mini_app_path: `worldapp://mini-app?app_id=${appId}&path=${encodeURIComponent(miniAppPath)}`,
      }),
    }

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

    if (!response.ok) {
      const errorText = await response.text()
      console.error('World API notification error:', response.status, errorText)
      return false
    }

    return true
  } catch (error) {
    console.error('Send notification error:', error)
    return false
  }
}
