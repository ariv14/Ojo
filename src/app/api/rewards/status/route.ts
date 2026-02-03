import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Call the database function to check claim status
    const { data, error } = await supabase.rpc('can_claim_today', {
      p_user_id: userId,
    })

    if (error) {
      console.error('Error checking claim status:', error)

      // If function doesn't exist, return default status for new user
      if (error.code === '42883') {
        return NextResponse.json({
          canClaim: true,
          balance: 0,
          streak: 0,
          longestStreak: 0,
          totalClaimed: 0,
          claimCount: 0,
          nextClaimAt: null,
          secondsUntil: 0,
          streakExpiresAt: null,
        })
      }

      return NextResponse.json(
        { error: 'Failed to check claim status' },
        { status: 500 }
      )
    }

    // Parse the JSON result from the function
    const status = typeof data === 'string' ? JSON.parse(data) : data

    return NextResponse.json({
      canClaim: status.canClaim ?? true,
      balance: Number(status.balance ?? 0),
      streak: status.streak ?? 0,
      longestStreak: status.longestStreak ?? 0,
      totalClaimed: Number(status.totalClaimed ?? 0),
      claimCount: status.claimCount ?? 0,
      nextClaimAt: status.nextClaimAt ?? null,
      secondsUntil: status.secondsUntil ?? 0,
      streakExpiresAt: status.streakExpiresAt ?? null,
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
