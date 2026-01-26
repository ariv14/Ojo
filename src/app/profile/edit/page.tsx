'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSession, setSession } from '@/lib/session'
import { ensureWalletConnected } from '@/lib/wallet'
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from '@worldcoin/minikit-js'
import { isLegacySupabaseUrl, resolveImageUrl } from '@/lib/s3'
import { compressImage } from '@/utils/compress'

const SEX_OPTIONS = ['Male', 'Female', 'Other']

const COUNTRIES = [
  'Argentina',
  'Austria',
  'Brazil',
  'Chile',
  'Colombia',
  'Costa Rica',
  'Ecuador',
  'Germany',
  'Guatemala',
  'Japan',
  'Korea, Republic of',
  'Malaysia',
  'Mexico',
  'Panama',
  'Peru',
  'Poland',
  'Portugal',
  'Singapore',
  'Taiwan',
  'United Kingdom',
  'United States',
]

export default function EditProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Username is read-only (synced from World App)
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('')
  const [sex, setSex] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [bio, setBio] = useState('')
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [nullifierHash, setNullifierHash] = useState<string | null>(null)
  const [isDisabled, setIsDisabled] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [invisibleExpiry, setInvisibleExpiry] = useState<string | null>(null)
  const [isBuyingInvisible, setIsBuyingInvisible] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.push('/')
      return
    }

    setNullifierHash(session.nullifier_hash)

    // Fetch current user data from database
    const fetchUser = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('username, first_name, country, avatar_url, sex, age, status, invisible_mode_expiry, bio, wallet_address')
        .eq('nullifier_hash', session.nullifier_hash)
        .single()

      if (error) {
        console.error('Error fetching user:', error)
        setError('Failed to load profile.')
        setIsLoading(false)
        return
      }

      if (data) {
        setUsername(data.username || data.first_name || '')
        setCountry(data.country || '')
        setCurrentAvatarUrl(data.avatar_url)
        setSex(data.sex || '')
        setAge(data.age || '')
        setIsDisabled(data.status === 'disabled')
        setInvisibleExpiry(data.invisible_mode_expiry)
        setBio(data.bio || '')
        setWalletAddress(data.wallet_address || null)
      }
      setIsLoading(false)
    }

    fetchUser()
  }, [router])

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleToggleDisable = async () => {
    if (!nullifierHash) return

    const newStatus = isDisabled ? 'active' : 'disabled'

    await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('nullifier_hash', nullifierHash)

    setIsDisabled(!isDisabled)
  }

  const handleDeleteAccount = async () => {
    if (!nullifierHash) return

    setIsDeleting(true)

    // 1. Get all user's post images, albums, and reels
    const { data: userPosts } = await supabase
      .from('posts')
      .select('image_url, media_urls, thumbnail_url')
      .eq('user_id', nullifierHash)

    // 2. Prepare storage cleanup
    const supabasePhotosToDelete: string[] = []
    const supabaseAvatarsToDelete: string[] = []
    const r2Keys: string[] = []

    // Process post images - separate legacy Supabase URLs from R2 keys
    userPosts?.forEach(post => {
      if (post.image_url) {
        if (isLegacySupabaseUrl(post.image_url)) {
          // Legacy Supabase URL
          const filename = post.image_url.split('/photos/')[1]?.split('?')[0]
          if (filename) supabasePhotosToDelete.push(filename)
        } else {
          // R2 key
          r2Keys.push(post.image_url)
        }
      }
      // Album media URLs (stored as array of {key, type} objects)
      if (post.media_urls?.length) {
        post.media_urls.forEach((m: { key: string; type: string }) => {
          if (m.key) r2Keys.push(m.key)
        })
      }
      // Reel thumbnail URLs (stored as key directly)
      if (post.thumbnail_url) {
        r2Keys.push(post.thumbnail_url)
      }
    })

    // Process avatar - separate legacy Supabase URLs from R2 keys
    if (currentAvatarUrl) {
      if (isLegacySupabaseUrl(currentAvatarUrl)) {
        const avatarFile = currentAvatarUrl.split('/avatars/')[1]?.split('?')[0]
        if (avatarFile) supabaseAvatarsToDelete.push(avatarFile)
      } else {
        r2Keys.push(currentAvatarUrl)
      }
    }

    // 3. Run all Supabase storage deletes in parallel
    const storageCleanupTasks: Promise<unknown>[] = []
    if (supabasePhotosToDelete.length > 0) {
      storageCleanupTasks.push(
        supabase.storage.from('photos').remove(supabasePhotosToDelete)
      )
    }
    if (supabaseAvatarsToDelete.length > 0) {
      storageCleanupTasks.push(
        supabase.storage.from('avatars').remove(supabaseAvatarsToDelete)
      )
    }
    await Promise.all(storageCleanupTasks)

    // 5. Delete R2 media in batches (API allows max 15 keys per request)
    for (let i = 0; i < r2Keys.length; i += 15) {
      const batch = r2Keys.slice(i, i + 15)
      await fetch('/api/s3-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: batch })
      })
    }

    // 6. Clear session
    localStorage.removeItem('ojo_user')

    // 7. Delete user (cascades to all related data)
    await supabase
      .from('users')
      .delete()
      .eq('nullifier_hash', nullifierHash)

    router.push('/')
  }

  const handleBuyInvisible = async () => {
    if (!nullifierHash) return

    if (!MiniKit.isInstalled()) {
      alert('Please open this app in World App')
      return
    }

    // Ensure user has wallet connected before payment
    const myWallet = await ensureWalletConnected()
    if (!myWallet) {
      return
    }

    setIsBuyingInvisible(true)

    const reference = `invisible_${Date.now()}`

    const payload: PayCommandInput = {
      reference,
      to: process.env.NEXT_PUBLIC_OWNER_WALLET!,
      tokens: [{
        symbol: Tokens.WLD,
        token_amount: tokenToDecimals(5, Tokens.WLD).toString(),
      }],
      description: 'Invisible Mode (30 days)',
    }

    try {
      const response = await MiniKit.commandsAsync.pay(payload)
      console.log('Payment response:', JSON.stringify(response))

      const { finalPayload } = response

      if (!finalPayload || Object.keys(finalPayload).length === 0) {
        // Payment was likely cancelled
        console.log('Payment cancelled or dismissed')
        setIsBuyingInvisible(false)
        return
      }

      if (finalPayload.status === 'success') {
        // Calculate new expiry (30 days from now, or extend existing)
        const now = new Date()
        const currentExpiry = invisibleExpiry ? new Date(invisibleExpiry) : now
        const baseDate = currentExpiry > now ? currentExpiry : now
        const newExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

        const { error } = await supabase
          .from('users')
          .update({ invisible_mode_expiry: newExpiry })
          .eq('nullifier_hash', nullifierHash)

        if (error) {
          console.error('Error updating invisible mode:', error.message)
          alert('Payment successful but failed to activate. Please contact support.')
        } else {
          setInvisibleExpiry(newExpiry)
          alert('Invisible Mode activated for 30 days!')
        }
      } else {
        console.error('Payment failed:', JSON.stringify(finalPayload))
        if (finalPayload.status === 'error') {
          alert('Payment error: ' + (finalPayload.error_code || 'Unknown error'))
        }
      }
    } catch (err) {
      console.error('Invisible mode purchase error:', err)
      alert('Payment failed. Please try again.')
    }

    setIsBuyingInvisible(false)
  }

  const handleToggleWallet = async () => {
    if (!nullifierHash) return

    if (walletAddress) {
      // Disconnect wallet
      const { error } = await supabase
        .from('users')
        .update({ wallet_address: null })
        .eq('nullifier_hash', nullifierHash)

      if (!error) {
        setWalletAddress(null)
      }
    } else {
      // Connect wallet
      setIsConnectingWallet(true)
      const newWallet = await ensureWalletConnected()
      if (newWallet) {
        setWalletAddress(newWallet)
      }
      setIsConnectingWallet(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nullifierHash) {
      setError('Session expired. Please log in again.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      let avatarUrl = currentAvatarUrl

      // Upload new avatar if selected
      if (avatarFile) {
        // Compress avatar image
        const compressed = await compressImage(avatarFile)

        // Get presigned URL for R2 upload
        const presignedResponse = await fetch('/api/avatar-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: nullifierHash }),
        })

        if (!presignedResponse.ok) {
          setError('Failed to prepare avatar upload. Please try again.')
          setIsSaving(false)
          return
        }

        const { key, presignedUrl } = await presignedResponse.json()

        // Upload to R2
        const uploadResponse = await fetch(presignedUrl, {
          method: 'PUT',
          body: compressed,
          headers: { 'Content-Type': 'image/jpeg' },
        })

        if (!uploadResponse.ok) {
          console.error('Upload error:', uploadResponse.status)
          setError('Failed to upload profile picture. Please try again.')
          setIsSaving(false)
          return
        }

        // Store R2 key (not full URL)
        avatarUrl = key
      }

      // Update user in database (username synced from World App, not editable here)
      const { error: dbError } = await supabase
        .from('users')
        .update({
          country: country || null,
          avatar_url: avatarUrl,
          sex: sex || null,
          age: age || null,
          bio: bio.trim() || null,
        })
        .eq('nullifier_hash', nullifierHash)

      if (dbError) {
        console.error('Database error:', dbError)
        setError('Failed to save profile. Please try again.')
        setIsSaving(false)
        return
      }

      // Update session
      setSession({
        nullifier_hash: nullifierHash,
        username: username,
        avatar_url: avatarUrl || undefined,
      })

      router.push(`/profile/${nullifierHash}`)
    } catch (err) {
      console.error('Error:', err)
      setError('Something went wrong. Please try again.')
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  const displayAvatar = avatarPreview || resolveImageUrl(currentAvatarUrl)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="w-full md:max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Edit Profile</h1>
          <div className="w-6" />
        </div>
      </div>

      {/* Form */}
      <div className="w-full md:max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-gray-400 transition"
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              )}
            </button>
            <p className="text-sm text-gray-500 mt-2">Tap to change photo</p>
          </div>

          {/* Username (read-only, synced from World App) */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Username
            </label>
            <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700">
              {username || 'Anonymous'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your username is synced from your World App profile
            </p>
          </div>

          {/* Country */}
          <div>
            <label
              htmlFor="country"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Country
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition bg-white"
            >
              <option value="">Select your country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sex */}
          <div>
            <label
              htmlFor="sex"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Sex
            </label>
            <select
              id="sex"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition bg-white"
            >
              <option value="">Prefer not to say</option>
              {SEX_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Age */}
          <div>
            <label
              htmlFor="age"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Age
            </label>
            <input
              id="age"
              type="number"
              min="18"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="Your age"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              About You
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a bit about yourself..."
              rows={3}
              maxLength={200}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/200</p>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Settings Section */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>

            {/* Disable Profile */}
            <div className="flex items-center justify-between py-4 border-b">
              <div>
                <p className="font-medium">Disable Profile</p>
                <p className="text-sm text-gray-500">
                  Hide your posts from the feed
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleDisable}
                className={`w-12 h-6 rounded-full transition ${
                  isDisabled ? 'bg-amber-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                    isDisabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Wallet Connection */}
            <div className="flex items-center justify-between py-4 border-b">
              <div>
                <p className="font-medium">Wallet Connected</p>
                <p className="text-sm text-gray-500">
                  {walletAddress
                    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                    : 'Connect wallet for payments'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleWallet}
                disabled={isConnectingWallet}
                className={`w-12 h-6 rounded-full transition disabled:opacity-50 ${
                  walletAddress ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                    walletAddress ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Invisible Mode */}
            <div className="flex items-center justify-between py-4 border-b">
              <div>
                <p className="font-medium">Invisible Mode</p>
                <p className="text-sm text-gray-500">
                  {invisibleExpiry && new Date(invisibleExpiry) > new Date()
                    ? `Active until ${new Date(invisibleExpiry).toLocaleDateString()}`
                    : 'Browse profiles without being seen'}
                </p>
              </div>
              {invisibleExpiry && new Date(invisibleExpiry) > new Date() ? (
                <span className="px-3 py-1 bg-green-100 text-green-600 text-sm rounded-full">
                  Active
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleBuyInvisible}
                  disabled={isBuyingInvisible}
                  className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50"
                >
                  {isBuyingInvisible ? '...' : '5 WLD'}
                </button>
              )}
            </div>

            {/* Support */}
            <button
              type="button"
              onClick={() => router.push('/support')}
              className="flex items-center justify-between w-full py-4 border-b"
            >
              <div className="text-left">
                <p className="font-medium">Support</p>
                <p className="text-sm text-gray-500">Get help or report an issue</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Legal */}
            <div className="py-4 border-b">
              <p className="font-medium mb-3">Legal</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/privacy')}
                  className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/terms')}
                  className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Terms of Service
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-red-600 uppercase mb-3">
                Danger Zone
              </h4>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 border-2 border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-50 transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-center mb-2">Delete Account?</h3>
            <p className="text-gray-500 text-center mb-6">
              This will permanently delete your account and all your data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
