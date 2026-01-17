'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import ChatButton from '@/components/ChatButton'

interface Follower {
  nullifier_hash: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  country: string | null
}

export default function FollowersPage() {
  const router = useRouter()
  const params = useParams()
  const profileId = params.id as string

  const [followers, setFollowers] = useState<Follower[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [profileName, setProfileName] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.push('/')
      return
    }

    setCurrentUserId(session.nullifier_hash)

    const fetchFollowers = async () => {
      // Fetch profile name
      const { data: profileData } = await supabase
        .from('users')
        .select('first_name')
        .eq('nullifier_hash', profileId)
        .single()

      setProfileName(profileData?.first_name || 'User')

      // Fetch followers with user details
      const { data: followersData, error } = await supabase
        .from('relationships')
        .select(`
          follower_id,
          users!relationships_follower_id_fkey (
            nullifier_hash,
            first_name,
            last_name,
            avatar_url,
            country
          )
        `)
        .eq('target_id', profileId)
        .eq('type', 'follow')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching followers:', error)
        setIsLoading(false)
        return
      }

      const followersList: Follower[] = []
      for (const f of followersData || []) {
        if (f.users) {
          const userData = f.users as unknown as Follower
          followersList.push(userData)
        }
      }

      setFollowers(followersList)
      setIsLoading(false)
    }

    fetchFollowers()
  }, [profileId, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-4">
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
        <div>
          <h1 className="text-lg font-semibold">Followers</h1>
          <p className="text-sm text-gray-500">{profileName}</p>
        </div>
      </div>

      {/* Followers List */}
      <div className="bg-white">
        {followers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No followers yet
          </div>
        ) : (
          <div className="divide-y">
            {followers.map((follower) => (
              <div
                key={follower.nullifier_hash}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition"
              >
                {/* Clickable area for profile */}
                <button
                  onClick={() => router.push(`/profile/${follower.nullifier_hash}`)}
                  className="flex items-center gap-3 flex-1"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {follower.avatar_url ? (
                      <img
                        src={follower.avatar_url}
                        alt={follower.first_name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium">
                        {follower.first_name?.[0] || '?'}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left">
                    <p className="font-medium">
                      {follower.first_name} {follower.last_name}
                    </p>
                    {follower.country && (
                      <p className="text-sm text-gray-500">{follower.country}</p>
                    )}
                  </div>
                </button>

                {/* Chat Button (only for other users) */}
                {currentUserId && currentUserId !== follower.nullifier_hash && (
                  <div className="px-3 py-1 border border-gray-300 rounded-lg text-blue-500 hover:bg-blue-50 transition">
                    <ChatButton targetUserAddress={follower.nullifier_hash} />
                  </div>
                )}

                {/* Arrow */}
                <button
                  onClick={() => router.push(`/profile/${follower.nullifier_hash}`)}
                  className="text-gray-400"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
