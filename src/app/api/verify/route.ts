import { NextRequest, NextResponse } from 'next/server'
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js'
import { supabase } from '@/lib/supabase'

interface ProfileData {
  username?: string
  profilePictureUrl?: string
  walletAddress?: string
}

export async function POST(req: NextRequest) {
  try {
    const { payload, signal, profileData } = await req.json() as {
      payload: ISuccessResult
      signal?: string
      profileData?: ProfileData
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
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('nullifier_hash', payload.nullifier_hash)
      .single()

    console.log('Database result:', { user: existingUser, error })

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (user not found)
      console.error('Database error:', error)
      return NextResponse.json(
        { status: 'error', message: 'Database error', details: error },
        { status: 500 }
      )
    }

    // Generate fallback username if not provided
    const username = profileData?.username ||
      (profileData?.walletAddress ? `user_${profileData.walletAddress.slice(2, 8)}` : `user_${payload.nullifier_hash.slice(0, 8)}`)

    if (existingUser) {
      // Existing user - update with World App data (profile sync on every login)
      const updateData: Record<string, unknown> = {}

      if (profileData) {
        // Always sync username if provided from World App
        if (profileData.username) {
          updateData.username = profileData.username
          updateData.first_name = profileData.username // Keep first_name synced for compatibility
        }
        // Always sync avatar if provided from World App
        if (profileData.profilePictureUrl) {
          updateData.avatar_url = profileData.profilePictureUrl
        }
        // Always sync wallet address
        if (profileData.walletAddress) {
          updateData.wallet_address = profileData.walletAddress
        }
      }

      // Only update if there's data to sync
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('nullifier_hash', payload.nullifier_hash)

        if (updateError) {
          console.error('Error updating user:', updateError)
        }
      }

      // Fetch the updated user
      const { data: updatedUser } = await supabase
        .from('users')
        .select('*')
        .eq('nullifier_hash', payload.nullifier_hash)
        .single()

      return NextResponse.json({
        status: 'ok',
        user: updatedUser || existingUser,
        isNewUser: false,
      })
    }

    // New user - create with World App data
    const newUserData = {
      nullifier_hash: payload.nullifier_hash,
      username: username,
      first_name: username, // Keep for backwards compatibility
      avatar_url: profileData?.profilePictureUrl || null,
      wallet_address: profileData?.walletAddress || null,
      is_orb_verified: true,
      status: 'active',
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(newUserData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user:', insertError)
      return NextResponse.json(
        { status: 'error', message: 'Failed to create user', details: insertError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      user: newUser,
      isNewUser: true,
    })

  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
