'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import ChatButton from '@/components/ChatButton'
import UserAvatar from '@/components/UserAvatar'
import { SkeletonUserRow } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { ChevronRight, Users } from 'lucide-react'
import Header from '@/components/Header'

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
      <div className="min-h-screen bg-gray-50 pt-14">
        <Header showBackButton onBack={() => router.back()} title="Followers" />
        <div className="w-full md:max-w-2xl mx-auto bg-white">
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonUserRow key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-14">
      <Header showBackButton onBack={() => router.back()} title={`Followers${profileName ? ` · ${profileName}` : ''}`} />

      {/* Followers List */}
      <div className="w-full md:max-w-2xl mx-auto bg-white">
        {followers.length === 0 ? (
          <EmptyState
            icon={<Users className="w-7 h-7" />}
            title="No followers yet"
            description="When people follow this profile, they'll appear here."
          />
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
                  <UserAvatar
                    avatarUrl={follower.avatar_url}
                    firstName={follower.first_name}
                    size="lg"
                    showStatus={false}
                  />

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
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
