import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('nullifier_hash')
      .eq('nullifier_hash', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Call the database function to process claim
    const { data, error } = await supabase.rpc('process_claim', {
      p_user_id: userId,
    })

    if (error) {
      console.error('Error processing claim:', error)

      // If function doesn't exist, handle manually
      if (error.code === '42883') {
        // Fallback: Manual claim processing
        return await processClaimManually(userId)
      }

      return NextResponse.json(
        { success: false, error: 'Failed to process claim' },
        { status: 500 }
      )
    }

    // Parse the JSON result from the function
    const result = typeof data === 'string' ? JSON.parse(data) : data

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Claim failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      amount: Number(result.amount),
      newBalance: Number(result.newBalance),
      streak: result.streak,
      longestStreak: result.longestStreak,
      isStreakBonus: result.isStreakBonus,
      streakBonus: result.streakBonus ? Number(result.streakBonus) : 0,
      wasStreakReset: result.wasStreakReset,
      message: result.message,
    })
  } catch (error) {
    console.error('Claim error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Fallback function if RPC doesn't exist yet
async function processClaimManually(userId: string) {
  try {
    const BASE_AMOUNT = 1.0
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    // Get current balance
    const { data: balance, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (balanceError && balanceError.code !== 'PGRST116') {
      throw balanceError
    }

    let newStreak = 1
    let streakBonus = 0
    let wasStreakReset = false

    if (balance) {
      // Check if can claim (24 hours passed)
      if (balance.last_claim_at && new Date(balance.last_claim_at) > twentyFourHoursAgo) {
        return NextResponse.json(
          { success: false, error: 'Too early to claim' },
          { status: 400 }
        )
      }

      // Check streak expiry
      if (balance.streak_expires_at && new Date(balance.streak_expires_at) < now) {
        wasStreakReset = true
        newStreak = 1
      } else {
        newStreak = (balance.current_streak || 0) + 1
      }

      streakBonus = Math.min(newStreak * 0.1, 1.0)
    }

    const amount = BASE_AMOUNT + streakBonus
    const streakExpiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    // Update or insert balance
    const newBalance = (balance?.ojo_balance || 0) + amount
    const longestStreak = Math.max(balance?.longest_streak || 0, newStreak)

    const { error: upsertError } = await supabase
      .from('user_balances')
      .upsert({
        user_id: userId,
        ojo_balance: newBalance,
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_claim_at: now.toISOString(),
        streak_expires_at: streakExpiresAt.toISOString(),
        total_claimed: (balance?.total_claimed || 0) + amount,
        claim_count: (balance?.claim_count || 0) + 1,
        updated_at: now.toISOString(),
      })

    if (upsertError) {
      throw upsertError
    }

    // Record claim
    await supabase.from('claims').insert({
      user_id: userId,
      amount: amount,
      streak_day: newStreak,
    })

    return NextResponse.json({
      success: true,
      amount: amount,
      newBalance: newBalance,
      streak: newStreak,
      longestStreak: longestStreak,
      isStreakBonus: streakBonus > 0,
      streakBonus: streakBonus,
      wasStreakReset: wasStreakReset,
      message: wasStreakReset
        ? 'Streak reset! Start building again!'
        : newStreak >= 7
          ? 'Amazing! Week-long streak!'
          : streakBonus > 0
            ? 'Streak bonus earned!'
            : 'OJO claimed successfully!',
    })
  } catch (error) {
    console.error('Manual claim error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process claim' },
      { status: 500 }
    )
  }
}
