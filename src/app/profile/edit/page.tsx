'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSession, setSession } from '@/lib/session'
import { ensureWalletConnected } from '@/lib/wallet'
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from '@worldcoin/minikit-js'
import { isLegacySupabaseUrl, resolveImageUrl } from '@/lib/s3'
import { compressImage } from '@/utils/compress'
import { Camera, ChevronRight, Shield, Eye, Wallet, HelpCircle, Trash2 } from 'lucide-react'
import Header from '@/components/Header'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import AppBackground from '@/components/ui/AppBackground'

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

      // Navigate to profile
      router.push(`/profile/${nullifierHash}`)
    } catch (err) {
      console.error('Error:', err)
      setError('Something went wrong. Please try again.')
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <AppBackground>
          <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="spinner-iris" />
              <p className="text-sm text-[var(--text-secondary)]">Loading profile...</p>
            </div>
          </div>
        </AppBackground>
      </div>
    )
  }

  const displayAvatar = avatarPreview || resolveImageUrl(currentAvatarUrl)

  return (
    <div className="min-h-screen">
      <Header showBackButton onBack={() => router.back()} title="Edit Profile" />

      <AppBackground>
        {/* Form */}
        <div className="w-full md:max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6 bg-[#1A1A2E] rounded-2xl p-6 shadow-sm border border-[#2A2A3E]">
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
              className="relative w-24 h-24 rounded-full bg-[var(--obsidian-surface)] border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden hover:border-[var(--iris-blue)] transition group"
            >
              {displayAvatar ? (
                <>
                  <img
                    src={displayAvatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <Camera className="w-8 h-8 text-[var(--text-tertiary)]" />
              )}
            </button>
            <p className="text-sm text-[var(--text-secondary)] mt-2">Tap to change photo</p>
          </div>

          {/* Username (read-only, synced from World App) */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Username
            </label>
            <div className="w-full px-4 py-3 bg-[var(--obsidian-surface)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)]">
              {username || 'Anonymous'}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Your username is synced from your World App profile
            </p>
          </div>

          {/* Country */}
          <div>
            <label
              htmlFor="country"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Country
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--iris-blue)] focus:border-transparent outline-none transition bg-[var(--obsidian-elevated)] text-[var(--sclera-white)]"
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
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Sex
            </label>
            <select
              id="sex"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--iris-blue)] focus:border-transparent outline-none transition bg-[var(--obsidian-elevated)] text-[var(--sclera-white)]"
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
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
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
              className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--iris-blue)] focus:border-transparent outline-none transition bg-[var(--obsidian-elevated)] text-[var(--sclera-white)] placeholder:text-[var(--text-tertiary)]"
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              About You
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a bit about yourself..."
              rows={3}
              maxLength={200}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--iris-blue)] focus:border-transparent outline-none transition resize-none bg-[var(--obsidian-elevated)] text-[var(--sclera-white)] placeholder:text-[var(--text-tertiary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1 text-right">{bio.length}/200</p>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isSaving}
            isLoading={isSaving}
            size="lg"
            className="w-full btn-iris"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>

          {/* Settings Section */}
          <div className="mt-12 pt-8 border-t border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--sclera-white)] mb-4">Settings</h3>

            {/* Disable Profile */}
            <div className="flex items-center justify-between py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4.5 h-4.5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-[var(--sclera-white)]">Disable Profile</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Hide your posts from the feed
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleDisable}
                className={`w-12 h-6 rounded-full transition ${
                  isDisabled ? 'bg-amber-500' : 'bg-[var(--obsidian-surface)]'
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
            <div className="flex items-center justify-between py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-4.5 h-4.5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-[var(--sclera-white)]">Wallet Connected</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {walletAddress
                      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                      : 'Connect wallet for payments'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleWallet}
                disabled={isConnectingWallet}
                className={`w-12 h-6 rounded-full transition disabled:opacity-50 ${
                  walletAddress ? 'bg-green-500' : 'bg-[var(--obsidian-surface)]'
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
            <div className="flex items-center justify-between py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Eye className="w-4.5 h-4.5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-[var(--sclera-white)]">Invisible Mode</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {invisibleExpiry && new Date(invisibleExpiry) > new Date()
                      ? `Active until ${new Date(invisibleExpiry).toLocaleDateString()}`
                      : 'Browse profiles without being seen'}
                  </p>
                </div>
              </div>
              {invisibleExpiry && new Date(invisibleExpiry) > new Date() ? (
                <span className="px-3 py-1 bg-green-500/10 text-green-500 text-sm rounded-full">
                  Active
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleBuyInvisible}
                  disabled={isBuyingInvisible}
                  className="px-4 py-2 bg-[var(--iris-blue)] text-white text-sm rounded-lg font-medium hover:bg-[var(--iris-blue-hover)] transition disabled:opacity-50"
                >
                  {isBuyingInvisible ? '...' : '5 WLD'}
                </button>
              )}
            </div>

            {/* Support */}
            <button
              type="button"
              onClick={() => router.push('/support')}
              className="flex items-center justify-between w-full py-4 border-b border-[var(--border)]"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-full bg-[var(--iris-blue)]/10 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-4.5 h-4.5 text-[var(--iris-blue)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--sclera-white)]">Support</p>
                  <p className="text-sm text-[var(--text-secondary)]">Get help or report an issue</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)]" />
            </button>

            {/* Legal */}
            <div className="py-4 border-b border-[var(--border)]">
              <p className="font-medium mb-3 text-[var(--sclera-white)]">Legal</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/privacy')}
                  className="flex-1 py-2 px-3 border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--obsidian-elevated)] transition"
                >
                  Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/terms')}
                  className="flex-1 py-2 px-3 border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--obsidian-elevated)] transition"
                >
                  Terms of Service
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <h4 className="text-sm font-semibold text-red-500 uppercase mb-3">
                Danger Zone
              </h4>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setShowDeleteConfirm(true)}
                leftIcon={<Trash2 className="w-4 h-4" />}
                className="w-full border-red-500/30 text-red-500 hover:bg-red-500/20 hover:text-red-400"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </form>
        </div>
      </AppBackground>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => !isDeleting && setShowDeleteConfirm(false)}
        closeOnBackdrop={!isDeleting}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-center mb-2 text-[var(--sclera-white)]">Delete Account?</h3>
          <p className="text-[var(--text-secondary)] text-center mb-6">
            This will permanently delete your account and all your data. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="flex-1 btn-outline-dark"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              isLoading={isDeleting}
              className="flex-1"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
