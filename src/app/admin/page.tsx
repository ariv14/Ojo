'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { isLegacySupabaseUrl, resolveImageUrl } from '@/lib/s3'

interface Stats {
  totalUsers: number
  activeUsers: number
  disabledUsers: number
  bannedUsers: number
  totalPosts: number
  pendingReports: number
  openTickets: number
  newThisWeek: number
  activeToday: number
}

interface AdminUser {
  nullifier_hash: string
  first_name: string
  last_name: string
  avatar_url: string | null
  country: string | null
  status: string
  created_at: string
  last_seen_at: string | null
  post_count: number
}

interface Report {
  id: string
  reporter_id: string
  target_id: string
  target_type: 'post' | 'user'
  reason: string
  status: string
  created_at: string
}

interface Ticket {
  id: string
  user_id: string
  subject: string
  message: string
  status: string
  admin_response: string | null
  user_response: string | null
  created_at: string
}

interface ReferralBonusUser {
  referrer_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  wallet_address: string | null
  unpaid_completed: number
  bonuses_owed: number
}

export default function AdminPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [adminResponse, setAdminResponse] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const [processingReportId, setProcessingReportId] = useState<string | null>(null)
  const [reportsKey, setReportsKey] = useState(0)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [userPage, setUserPage] = useState(0)
  const [hasMoreUsers, setHasMoreUsers] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'activity'>('recent')
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [referralBonusUsers, setReferralBonusUsers] = useState<ReferralBonusUser[]>([])
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.push('/')
      return
    }

    // Check admin access - use ADMIN_ID if set, otherwise fall back to OWNER_WALLET
    const adminId = process.env.NEXT_PUBLIC_ADMIN_ID || process.env.NEXT_PUBLIC_OWNER_WALLET

    if (session.nullifier_hash !== adminId) {
      setDebugInfo(`Access Denied\n\nYour ID: ${session.nullifier_hash}\nAdmin ID: ${adminId || '(not set)'}\n\nSet NEXT_PUBLIC_ADMIN_ID in .env.local to your nullifier_hash`)
      setIsLoading(false)
      return
    }

    setIsAuthorized(true)
    fetchDashboardData()
    fetchAdminUsers(0, false)
    fetchReferralBonusUsers()
  }, [router])

  const fetchReferralBonusUsers = async () => {
    // Fetch users who have 10+ unpaid completed referrals
    const { data, error } = await supabase
      .from('referrals')
      .select('referrer_id')
      .eq('status', 'completed')
      .eq('paid_out', false)

    if (error) {
      console.error('Error fetching referral data:', error)
      return
    }

    // Count unpaid completed referrals per user
    const countByUser: Record<string, number> = {}
    data?.forEach(r => {
      countByUser[r.referrer_id] = (countByUser[r.referrer_id] || 0) + 1
    })

    // Filter users with 10+ unpaid referrals
    const eligibleUserIds = Object.entries(countByUser)
      .filter(([, count]) => count >= 10)
      .map(([userId]) => userId)

    if (eligibleUserIds.length === 0) {
      setReferralBonusUsers([])
      return
    }

    // Fetch user details for eligible users
    const { data: usersData } = await supabase
      .from('users')
      .select('nullifier_hash, first_name, last_name, avatar_url, wallet_address')
      .in('nullifier_hash', eligibleUserIds)

    const bonusUsers: ReferralBonusUser[] = (usersData || []).map(u => ({
      referrer_id: u.nullifier_hash,
      first_name: u.first_name,
      last_name: u.last_name,
      avatar_url: u.avatar_url,
      wallet_address: u.wallet_address,
      unpaid_completed: countByUser[u.nullifier_hash] || 0,
      bonuses_owed: Math.floor((countByUser[u.nullifier_hash] || 0) / 10),
    }))

    // Sort by bonuses owed (descending)
    bonusUsers.sort((a, b) => b.bonuses_owed - a.bonuses_owed)
    setReferralBonusUsers(bonusUsers)
  }

  const handleMarkPaidOut = async (referrerId: string, numToPay: number) => {
    setProcessingPayoutId(referrerId)

    // Mark the first (numToPay * 10) unpaid completed referrals as paid
    const { data: referralsToMark } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referrerId)
      .eq('status', 'completed')
      .eq('paid_out', false)
      .limit(numToPay * 10)

    if (referralsToMark && referralsToMark.length > 0) {
      const ids = referralsToMark.map(r => r.id)
      await supabase
        .from('referrals')
        .update({ paid_out: true })
        .in('id', ids)
    }

    // Refresh the list
    await fetchReferralBonusUsers()
    setProcessingPayoutId(null)
  }

  const fetchDashboardData = async () => {
    // Clean up tickets older than 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    await supabase
      .from('support_tickets')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())

    // Calculate date ranges
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    // Fetch all stats in parallel
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: disabledUsers },
      { count: bannedUsers },
      { count: totalPosts },
      { count: pendingReports },
      { count: openTickets },
      { count: newThisWeek },
      { count: activeToday },
      { data: reportsData },
      { data: ticketsData },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'disabled'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'banned'),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString()),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_seen_at', oneDayAgo.toISOString()),
      supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(20),
    ])

    setStats({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      disabledUsers: disabledUsers || 0,
      bannedUsers: bannedUsers || 0,
      totalPosts: totalPosts || 0,
      pendingReports: pendingReports || 0,
      openTickets: openTickets || 0,
      newThisWeek: newThisWeek || 0,
      activeToday: activeToday || 0,
    })

    setReports(reportsData || [])
    setTickets(ticketsData || [])
    setIsLoading(false)
  }

  const refetchReports = async () => {
    const [
      { count: pendingReports },
      { data: reportsData },
    ] = await Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(20),
    ])
    setStats(prev => prev ? { ...prev, pendingReports: pendingReports || 0 } : null)
    setReports(reportsData || [])
    setReportsKey(prev => prev + 1)
  }

  const handleDismissReport = async (reportId: string) => {
    setProcessingReportId(reportId)

    const { data, error } = await supabase
      .from('reports')
      .update({ status: 'dismissed' })
      .eq('id', reportId)
      .select()

    if (error) {
      console.error('Error dismissing report:', error.message)
      alert('Failed to dismiss report: ' + error.message)
    } else if (!data || data.length === 0) {
      console.error('No rows updated - check RLS policies')
      alert('Failed to update report. Please check database permissions.')
    }

    await refetchReports()
    setProcessingReportId(null)
  }

  const handleBanUser = async (report: Report) => {
    if (report.target_type !== 'user') return
    setProcessingReportId(report.id)

    const [userResult, reportResult] = await Promise.all([
      supabase.from('users').update({ status: 'banned' }).eq('nullifier_hash', report.target_id).select(),
      supabase.from('reports').update({ status: 'actioned' }).eq('id', report.id).select(),
    ])

    if (userResult.error || reportResult.error) {
      console.error('Error banning user:', userResult.error?.message, reportResult.error?.message)
      alert('Failed to ban user: ' + (userResult.error?.message || reportResult.error?.message))
    } else if (!reportResult.data || reportResult.data.length === 0) {
      alert('Failed to update report. Please check database permissions.')
    }

    await refetchReports()
    setStats(prev => prev ? {
      ...prev,
      bannedUsers: prev.bannedUsers + 1,
      activeUsers: Math.max(0, prev.activeUsers - 1),
    } : null)
    setProcessingReportId(null)
  }

  const handleHidePost = async (report: Report) => {
    if (report.target_type !== 'post') return
    setProcessingReportId(report.id)

    const [postResult, reportResult] = await Promise.all([
      supabase.from('posts').update({ is_hidden: true }).eq('id', report.target_id).select(),
      supabase.from('reports').update({ status: 'actioned' }).eq('id', report.id).select(),
    ])

    if (postResult.error || reportResult.error) {
      console.error('Error hiding post:', postResult.error?.message, reportResult.error?.message)
      alert('Failed to hide post: ' + (postResult.error?.message || reportResult.error?.message))
    } else if (!reportResult.data || reportResult.data.length === 0) {
      alert('Failed to update report. Please check database permissions.')
    }

    await refetchReports()
    setProcessingReportId(null)
  }

  const handleDeletePost = async (report: Report) => {
    if (report.target_type !== 'post') return
    setProcessingReportId(report.id)

    // Fetch the post to get its media URLs for R2 cleanup
    const { data: postData } = await supabase
      .from('posts')
      .select('image_url, media_urls, thumbnail_url')
      .eq('id', report.target_id)
      .single()

    // Clean up R2/Supabase storage before deleting from DB
    if (postData) {
      const r2KeysToDelete: string[] = []

      // Handle image_url (could be legacy Supabase URL or R2 key)
      if (postData.image_url) {
        if (isLegacySupabaseUrl(postData.image_url)) {
          // Legacy Supabase Storage - extract filename and delete
          const filename = postData.image_url.split('/photos/')[1]?.split('?')[0]
          if (filename) {
            await supabase.storage.from('photos').remove([filename])
          }
        } else {
          // R2 key - add to batch delete
          r2KeysToDelete.push(postData.image_url)
        }
      }

      // Handle R2 media (albums and reels)
      if (postData.media_urls && postData.media_urls.length > 0) {
        r2KeysToDelete.push(...postData.media_urls.map((m: { key: string }) => m.key))
        if (postData.thumbnail_url) {
          r2KeysToDelete.push(postData.thumbnail_url)
        }
      }

      // Delete all R2 objects in one request
      if (r2KeysToDelete.length > 0) {
        try {
          await fetch('/api/s3-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keys: r2KeysToDelete }),
          })
        } catch (error) {
          console.error('Failed to delete R2 objects:', error)
        }
      }
    }

    const { error: deleteError } = await supabase.from('posts').delete().eq('id', report.target_id)
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .update({ status: 'actioned' })
      .eq('id', report.id)
      .select()

    if (deleteError || reportError) {
      console.error('Error deleting post:', deleteError?.message, reportError?.message)
      alert('Failed to delete post: ' + (deleteError?.message || reportError?.message))
    } else if (!reportData || reportData.length === 0) {
      alert('Failed to update report. Please check database permissions.')
    }

    await refetchReports()
    setStats(prev => prev ? {
      ...prev,
      totalPosts: Math.max(0, prev.totalPosts - 1),
    } : null)
    setProcessingReportId(null)
  }

  const handleUpdateTicket = async (ticketId: string, status: string) => {
    await supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', ticketId)

    setTickets(prev => prev.map(t =>
      t.id === ticketId ? { ...t, status } : t
    ))
    if (status === 'resolved' || status === 'closed') {
      setStats(prev => prev ? { ...prev, openTickets: prev.openTickets - 1 } : null)
    }
  }

  const handleRespondToTicket = async (newStatus: string) => {
    if (!selectedTicket) return

    setIsResponding(true)

    const updateData: { status: string; admin_response?: string } = { status: newStatus }
    if (adminResponse.trim()) {
      updateData.admin_response = adminResponse.trim()
    }

    await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', selectedTicket.id)

    setTickets(prev => prev.map(t =>
      t.id === selectedTicket.id ? { ...t, ...updateData } : t
    ))

    if (newStatus === 'resolved' || newStatus === 'closed') {
      if (selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') {
        setStats(prev => prev ? { ...prev, openTickets: prev.openTickets - 1 } : null)
      }
    }

    setSelectedTicket(null)
    setAdminResponse('')
    setIsResponding(false)
  }

  const handleFactoryReset = async () => {
    if (resetConfirmText !== 'DELETE-ALL') return

    setIsResetting(true)

    const session = getSession()
    const response = await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: session?.nullifier_hash }),
    })

    if (response.ok) {
      localStorage.removeItem('ojo_user')
      router.push('/')
    } else {
      setIsResetting(false)
      alert('Failed to reset. Please try again.')
    }
  }

  const USERS_PER_PAGE = 10

  // Use RPC function to get users with post counts in a single query
  const fetchAdminUsers = async (
    pageNum: number,
    append: boolean,
    searchOverride?: string,
    sortOverride?: 'recent' | 'activity'
  ) => {
    setIsLoadingUsers(true)
    const offset = pageNum * USERS_PER_PAGE

    // Use overrides if provided, otherwise use current state
    const searchValue = searchOverride !== undefined ? searchOverride : userSearch
    const sortValue = sortOverride !== undefined ? sortOverride : sortBy

    const { data: usersData, error } = await supabase.rpc('get_users_with_post_counts', {
      p_limit: USERS_PER_PAGE,
      p_offset: offset,
      p_search: searchValue.trim() || null,
      p_sort: sortValue === 'activity' ? 'activity' : 'newest',
    })

    if (error) {
      console.error('Error fetching users:', error)
      setIsLoadingUsers(false)
      return
    }

    const usersWithCounts: AdminUser[] = (usersData || []).map((user: AdminUser) => ({
      nullifier_hash: user.nullifier_hash,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar_url: user.avatar_url,
      country: user.country,
      status: user.status,
      created_at: user.created_at,
      last_seen_at: user.last_seen_at,
      post_count: Number(user.post_count) || 0,
    }))

    if (!usersData || usersData.length < USERS_PER_PAGE) {
      setHasMoreUsers(false)
    } else {
      setHasMoreUsers(true)
    }

    if (append) {
      setAdminUsers(prev => [...prev, ...usersWithCounts])
    } else {
      setAdminUsers(usersWithCounts)
    }
    setIsLoadingUsers(false)
  }

  const handleUserSearch = async (query: string) => {
    setUserSearch(query)
    setUserPage(0)
    setHasMoreUsers(true)
    // Pass search value directly to avoid stale state
    fetchAdminUsers(0, false, query, sortBy)
  }

  const handleSortChange = (newSort: 'recent' | 'activity') => {
    setSortBy(newSort)
    setUserPage(0)
    setHasMoreUsers(true)
    // Pass sort value directly to avoid stale state
    fetchAdminUsers(0, false, userSearch, newSort)
  }

  const handleLoadMoreUsers = async () => {
    if (isLoadingUsers || !hasMoreUsers) return
    const nextPage = userPage + 1
    setUserPage(nextPage)
    await fetchAdminUsers(nextPage, true)
  }

  const handleBanUserDirect = async (userId: string) => {
    setProcessingUserId(userId)

    const { error } = await supabase
      .from('users')
      .update({ status: 'banned' })
      .eq('nullifier_hash', userId)

    if (error) {
      console.error('Error banning user:', error)
      alert('Failed to ban user: ' + error.message)
    } else {
      // Update local state
      setAdminUsers(prev => prev.map(u =>
        u.nullifier_hash === userId ? { ...u, status: 'banned' } : u
      ))
      setStats(prev => prev ? {
        ...prev,
        bannedUsers: prev.bannedUsers + 1,
        activeUsers: Math.max(0, prev.activeUsers - 1),
      } : null)
    }

    setProcessingUserId(null)
  }

  const handleUnbanUser = async (userId: string) => {
    setProcessingUserId(userId)

    const { error } = await supabase
      .from('users')
      .update({ status: 'active' })
      .eq('nullifier_hash', userId)

    if (error) {
      console.error('Error unbanning user:', error)
      alert('Failed to unban user: ' + error.message)
    } else {
      // Update local state
      setAdminUsers(prev => prev.map(u =>
        u.nullifier_hash === userId ? { ...u, status: 'active' } : u
      ))
      setStats(prev => prev ? {
        ...prev,
        bannedUsers: Math.max(0, prev.bannedUsers - 1),
        activeUsers: prev.activeUsers + 1,
      } : null)
    }

    setProcessingUserId(null)
  }

  if (!isAuthorized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        {debugInfo ? (
          <div className="bg-white p-6 rounded-xl shadow max-w-md w-full">
            <pre className="text-sm whitespace-pre-wrap break-all font-mono">{debugInfo}</pre>
            <button
              onClick={() => router.push('/feed')}
              className="mt-4 w-full py-2 bg-black text-white rounded-lg"
            >
              Go to Feed
            </button>
          </div>
        ) : (
          <p className="text-gray-500">Loading...</p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <button
          onClick={() => router.push('/feed')}
          className="text-gray-500 hover:text-gray-700"
        >
          Back to Feed
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats?.totalUsers || 0} />
          <StatCard label="Active Users" value={stats?.activeUsers || 0} color="green" />
          <StatCard label="Disabled" value={stats?.disabledUsers || 0} color="yellow" />
          <StatCard label="Banned" value={stats?.bannedUsers || 0} color="red" />
          <StatCard label="Total Posts" value={stats?.totalPosts || 0} />
          <StatCard label="Pending Reports" value={stats?.pendingReports || 0} color="red" />
          <StatCard label="Open Tickets" value={stats?.openTickets || 0} color="yellow" />
          <StatCard label="New This Week" value={stats?.newThisWeek || 0} color="green" />
          <StatCard label="Active Today" value={stats?.activeToday || 0} color="green" />
        </div>

        {/* User Management Section */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">User Management</h2>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => handleUserSearch(e.target.value)}
              placeholder="Search users..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
            />
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as 'recent' | 'activity')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
            >
              <option value="recent">Sort: Recent</option>
              <option value="activity">Sort: Last Active</option>
            </select>
          </div>
          {adminUsers.length === 0 && !isLoadingUsers ? (
            <p className="text-gray-500 text-center py-4">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">User</th>
                    <th className="text-left py-2 px-2">Country</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Posts</th>
                    <th className="text-left py-2 px-2">Joined</th>
                    <th className="text-left py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((user) => (
                    <tr key={user.nullifier_hash} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            {user.avatar_url ? (
                              <img src={resolveImageUrl(user.avatar_url)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                                {user.first_name?.[0] || '?'}
                              </div>
                            )}
                          </div>
                          <span className="font-medium">{user.first_name} {user.last_name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-gray-500">{user.country || '-'}</td>
                      <td className="py-2 px-2">
                        <UserStatusBadge status={user.status} />
                      </td>
                      <td className="py-2 px-2">{user.post_count}</td>
                      <td className="py-2 px-2">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => router.push(`/profile/${user.nullifier_hash}`)}
                            className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                          >
                            View
                          </button>
                          {user.status === 'banned' ? (
                            <button
                              onClick={() => handleUnbanUser(user.nullifier_hash)}
                              disabled={processingUserId === user.nullifier_hash}
                              className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200 disabled:opacity-50"
                            >
                              {processingUserId === user.nullifier_hash ? '...' : 'Unban'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBanUserDirect(user.nullifier_hash)}
                              disabled={processingUserId === user.nullifier_hash}
                              className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                            >
                              {processingUserId === user.nullifier_hash ? '...' : 'Ban'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Load More Users Button */}
          {hasMoreUsers && adminUsers.length > 0 && (
            <div className="mt-4">
              <button
                onClick={handleLoadMoreUsers}
                disabled={isLoadingUsers}
                className="w-full py-2 text-blue-500 font-medium border border-blue-500 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition"
              >
                {isLoadingUsers ? 'Loading...' : 'Load More Users'}
              </button>
            </div>
          )}
        </div>

        {/* Referral Bonus Payouts */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">Referral Bonus Payouts</h2>
          <p className="text-sm text-gray-500 mb-4">
            Users earn 1 WLD for every 10 completed referrals (referred user made their first post).
          </p>
          {referralBonusUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No users eligible for payout</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">User</th>
                    <th className="text-left py-2 px-2">Wallet</th>
                    <th className="text-left py-2 px-2">Unpaid Referrals</th>
                    <th className="text-left py-2 px-2">Bonuses Owed</th>
                    <th className="text-left py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referralBonusUsers.map((user) => (
                    <tr key={user.referrer_id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            {user.avatar_url ? (
                              <img src={resolveImageUrl(user.avatar_url)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                                {user.first_name?.[0] || '?'}
                              </div>
                            )}
                          </div>
                          <span className="font-medium">{user.first_name} {user.last_name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        {user.wallet_address ? (
                          <span className="font-mono text-xs">{user.wallet_address.slice(0, 8)}...</span>
                        ) : (
                          <span className="text-gray-400 text-xs">No wallet</span>
                        )}
                      </td>
                      <td className="py-2 px-2">{user.unpaid_completed}</td>
                      <td className="py-2 px-2">
                        <span className="font-bold text-amber-600">{user.bonuses_owed} WLD</span>
                      </td>
                      <td className="py-2 px-2">
                        {user.wallet_address ? (
                          <button
                            onClick={() => handleMarkPaidOut(user.referrer_id, user.bonuses_owed)}
                            disabled={processingPayoutId === user.referrer_id}
                            className="px-3 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200 disabled:opacity-50"
                          >
                            {processingPayoutId === user.referrer_id ? 'Processing...' : `Mark ${user.bonuses_owed} WLD Paid`}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">Needs wallet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-xl p-4" key={`reports-${reportsKey}`}>
          <h2 className="text-lg font-semibold mb-4">Recent Reports</h2>
          {reports.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No reports</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Type</th>
                    <th className="text-left py-2 px-2">Target</th>
                    <th className="text-left py-2 px-2">Reason</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b">
                      <td className="py-2 px-2 capitalize">{report.target_type}</td>
                      <td className="py-2 px-2 font-mono text-xs">{report.target_id.slice(0, 8)}...</td>
                      <td className="py-2 px-2">{report.reason}</td>
                      <td className="py-2 px-2">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="py-2 px-2">{new Date(report.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-2">
                        {report.status === 'pending' && (
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => handleDismissReport(report.id)}
                              disabled={processingReportId === report.id}
                              className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                            >
                              {processingReportId === report.id ? '...' : 'Dismiss'}
                            </button>
                            {report.target_type === 'user' && (
                              <button
                                onClick={() => handleBanUser(report)}
                                disabled={processingReportId === report.id}
                                className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                              >
                                {processingReportId === report.id ? '...' : 'Ban User'}
                              </button>
                            )}
                            {report.target_type === 'post' && (
                              <>
                                <button
                                  onClick={() => handleHidePost(report)}
                                  disabled={processingReportId === report.id}
                                  className="px-2 py-1 text-xs bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200 disabled:opacity-50"
                                >
                                  {processingReportId === report.id ? '...' : 'Hide Post'}
                                </button>
                                <button
                                  onClick={() => handleDeletePost(report)}
                                  disabled={processingReportId === report.id}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                                >
                                  {processingReportId === report.id ? '...' : 'Delete Post'}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Support Tickets Table */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">Support Tickets</h2>
          {tickets.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No tickets</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">User</th>
                    <th className="text-left py-2 px-2">Subject</th>
                    <th className="text-left py-2 px-2">Message</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedTicket(ticket)
                        setAdminResponse(ticket.admin_response || '')
                      }}
                    >
                      <td className="py-2 px-2 font-mono text-xs">{ticket.user_id.slice(0, 8)}...</td>
                      <td className="py-2 px-2 font-medium">{ticket.subject}</td>
                      <td className="py-2 px-2 text-gray-500 max-w-[200px] truncate">{ticket.message}</td>
                      <td className="py-2 px-2">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="py-2 px-2">{new Date(ticket.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1 flex-wrap">
                          {ticket.admin_response && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">
                              Replied
                            </span>
                          )}
                          {ticket.user_response && (
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded">
                              User replied
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl p-4 border-2 border-red-200">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Permanently delete all data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition"
          >
            Factory Reset
          </button>
        </div>
      </div>

      {/* Factory Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-center text-red-600 mb-2">
              Factory Reset
            </h3>
            <p className="text-gray-500 text-center text-sm mb-4">
              This will permanently delete ALL data including users, posts, messages, and everything else.
            </p>
            <p className="text-sm text-center mb-4">
              Type <span className="font-mono font-bold">DELETE-ALL</span> to confirm:
            </p>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="DELETE-ALL"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 font-mono text-center focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetModal(false)
                  setResetConfirmText('')
                }}
                disabled={isResetting}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFactoryReset}
                disabled={resetConfirmText !== 'DELETE-ALL' || isResetting}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Support Ticket</h3>
              <StatusBadge status={selectedTicket.status} />
            </div>

            <div className="space-y-4">
              {/* Ticket Info */}
              <div>
                <p className="text-xs text-gray-500 mb-1">User ID</p>
                <p className="font-mono text-sm bg-gray-50 p-2 rounded">{selectedTicket.user_id}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Subject</p>
                <p className="font-medium">{selectedTicket.subject}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Message</p>
                <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Submitted</p>
                <p className="text-sm text-gray-600">
                  {new Date(selectedTicket.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {/* User Response (if any) */}
              {selectedTicket.user_response && (
                <div>
                  <p className="text-xs text-purple-600 mb-1">User Reply</p>
                  <p className="text-gray-700 bg-purple-50 p-3 rounded border border-purple-100 whitespace-pre-wrap">
                    {selectedTicket.user_response}
                  </p>
                </div>
              )}

              {/* Admin Response */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Admin Response</label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Write a response to this ticket..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            {(selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedTicket(null)
                    setAdminResponse('')
                  }}
                  disabled={isResponding}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRespondToTicket('in_progress')}
                  disabled={isResponding || !adminResponse.trim()}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResponding ? 'Saving...' : 'Update'}
                </button>
                <button
                  onClick={() => handleRespondToTicket('resolved')}
                  disabled={isResponding || !adminResponse.trim()}
                  className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResponding ? 'Saving...' : 'Resolve'}
                </button>
              </div>
            )}

            {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedTicket(null)
                    setAdminResponse('')
                  }}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorClasses = {
    green: 'text-green-600',
    yellow: 'text-amber-600',
    red: 'text-red-600',
  }
  return (
    <div className="bg-white rounded-xl p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color ? colorClasses[color as keyof typeof colorClasses] : ''}`}>
        {value}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-600',
    open: 'bg-yellow-100 text-yellow-600',
    in_progress: 'bg-blue-100 text-blue-600',
    reviewed: 'bg-blue-100 text-blue-600',
    dismissed: 'bg-gray-100 text-gray-600',
    actioned: 'bg-red-100 text-red-600',
    resolved: 'bg-green-100 text-green-600',
    closed: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  )
}

function UserStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-600',
    disabled: 'bg-yellow-100 text-yellow-600',
    banned: 'bg-red-100 text-red-600',
  }
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  )
}
