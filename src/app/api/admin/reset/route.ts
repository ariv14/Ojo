import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { wallet_address } = await req.json()

    // Check if caller is the owner
    if (wallet_address !== process.env.NEXT_PUBLIC_OWNER_WALLET) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Call the reset function
    const { error } = await supabase.rpc('reset_all_data')

    if (error) {
      console.error('Reset error:', error)
      return NextResponse.json(
        { error: 'Failed to reset data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'All data has been reset successfully'
    })
  } catch (err) {
    console.error('Reset API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
