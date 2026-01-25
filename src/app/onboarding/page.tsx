'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { setSession } from '@/lib/session'
import { ensureWalletConnected } from '@/lib/wallet'
import { compressImage } from '@/utils/compress'

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

function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nullifierHash = searchParams.get('nullifier')
  const initialWallet = searchParams.get('wallet')
  const [walletAddress, setWalletAddress] = useState<string | null>(initialWallet)
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [country, setCountry] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      // Revoke old blob URL to prevent memory leak
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleToggleWallet = async () => {
    if (walletAddress) {
      // Disconnect wallet (just clear local state - not saved to DB yet)
      setWalletAddress(null)
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

  // Cleanup blob URL on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nullifierHash) {
      setError('Session expired. Please verify again.')
      return
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please fill in your name.')
      return
    }

    if (!country) {
      setError('Please select your country.')
      return
    }

    if (!avatarFile) {
      setError('Please upload a profile picture.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
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
        setIsLoading(false)
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
        setIsLoading(false)
        return
      }

      // Store R2 key (not full URL)
      const avatarUrl = key

      // Upsert user with all profile data
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          nullifier_hash: nullifierHash,
          wallet_address: walletAddress || null,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          country: country,
          avatar_url: avatarUrl,
          bio: bio.trim() || null,
          is_orb_verified: true,
        }, {
          onConflict: 'nullifier_hash'
        })

      if (dbError) {
        console.error('Database error:', dbError)
        setError('Failed to save profile. Please try again.')
        setIsLoading(false)
        return
      }

      // Store session and redirect
      setSession({
        nullifier_hash: nullifierHash,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        country: country,
        avatar_url: avatarUrl,
      })
      router.push('/feed')
    } catch (err) {
      console.error('Error:', err)
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h1 className="text-2xl font-bold text-center mb-2">
        Welcome to OJO
      </h1>
      <p className="text-gray-500 text-center mb-8">
        Complete your profile to continue
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center mb-4">
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
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <svg
                  className="w-8 h-8 mx-auto text-gray-400"
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
              </div>
            )}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            {avatarPreview ? 'Tap to change' : 'Add profile photo'}
          </p>
        </div>

        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter your first name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
          />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter your last name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
          />
        </div>

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

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            About You <span className="text-gray-400">(optional)</span>
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

        {/* Wallet Connection */}
        <div className="flex items-center justify-between py-3 px-1">
          <div>
            <p className="font-medium text-sm">Wallet Connected</p>
            <p className="text-xs text-gray-500">
              {walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : 'Connect for payments'}
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

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-gray-500">Loading...</p>
          </div>
        }>
          <OnboardingForm />
        </Suspense>
      </div>
    </div>
  )
}
