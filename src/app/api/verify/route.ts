import { NextRequest, NextResponse } from 'next/server'
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { payload, signal } = await req.json() as {
      payload: ISuccessResult
      signal?: string
    }

    const app_id = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`
    const action = process.env.NEXT_PUBLIC_ACTION!

    // Verify the proof with World ID
    console.log('Verifying with:', { app_id, action, payload })
    const verifyRes: IVerifyResponse = await verifyCloudProof(
      payload,
      app_id,
      action,
      signal
    )
    console.log('Verify response:', JSON.stringify(verifyRes, null, 2))

    if (!verifyRes.success) {
      return NextResponse.json(
        { status: 'error', message: 'Verification failed', details: verifyRes },
        { status: 400 }
      )
    }

    // Check if user exists in database by nullifier_hash
    console.log('Checking for user with nullifier:', payload.nullifier_hash)
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('nullifier_hash', payload.nullifier_hash)
      .single()

    console.log('Database result:', { user, error })

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (user not found)
      console.error('Database error:', error)
      return NextResponse.json(
        { status: 'error', message: 'Database error', details: error },
        { status: 500 }
      )
    }

    if (user) {
      // Existing user - check if onboarding complete
      if (!user.first_name) {
        return NextResponse.json({
          status: 'new_user',
          nullifier_hash: payload.nullifier_hash,
        })
      }
      return NextResponse.json({
        status: 'ok',
        user
      })
    }

    // New user - needs onboarding
    return NextResponse.json({
      status: 'new_user',
      nullifier_hash: payload.nullifier_hash,
    })

  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
