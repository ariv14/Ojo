/**
 * Notification helper library
 *
 * Provides functions to send push notifications for common events.
 * Uses the internal /api/notify endpoint.
 *
 * Note: These functions should be called from server-side code only.
 * For client-side usage, call the API endpoint directly.
 */

import { sendNotification } from '@/app/api/notify/route'

/**
 * Notify a user when they receive a new follower
 */
export async function notifyNewFollower(
  recipientWallet: string,
  followerName: string
): Promise<boolean> {
  if (!recipientWallet) return false

  return sendNotification(
    [recipientWallet],
    'New follower!',
    `${followerName} started following you`,
    '/feed'
  )
}

/**
 * Notify a user when they receive a new message
 */
export async function notifyNewMessage(
  recipientWallet: string,
  senderName: string,
  connectionId: string
): Promise<boolean> {
  if (!recipientWallet) return false

  return sendNotification(
    [recipientWallet],
    'New message',
    `${senderName} sent you a message`,
    `/chat/${connectionId}`
  )
}

/**
 * Notify a user when their post is liked
 */
export async function notifyPostLiked(
  creatorWallet: string,
  likerName: string,
  postId: string
): Promise<boolean> {
  if (!creatorWallet) return false

  return sendNotification(
    [creatorWallet],
    'Someone liked your post!',
    `${likerName} liked your post`,
    `/feed?scrollTo=${postId}`
  )
}

/**
 * Notify a user when they receive a tip
 */
export async function notifyTipReceived(
  creatorWallet: string,
  tipperName: string,
  amount: number,
  postId: string
): Promise<boolean> {
  if (!creatorWallet) return false

  return sendNotification(
    [creatorWallet],
    'You received a tip!',
    `${tipperName} tipped you ${amount} WLD`,
    `/feed?scrollTo=${postId}`
  )
}

/**
 * Notify a user when someone unlocks their premium content
 */
export async function notifyPremiumUnlock(
  creatorWallet: string,
  buyerName: string,
  amount: number,
  postId: string
): Promise<boolean> {
  if (!creatorWallet) return false

  return sendNotification(
    [creatorWallet],
    'Premium content unlocked!',
    `${buyerName} paid ${amount} WLD for your content`,
    `/feed?scrollTo=${postId}`
  )
}

/**
 * Notify a user when someone views their profile
 */
export async function notifyProfileView(
  profileOwnerWallet: string,
  viewerName: string
): Promise<boolean> {
  if (!profileOwnerWallet) return false

  return sendNotification(
    [profileOwnerWallet],
    'Profile view',
    `${viewerName} viewed your profile`,
    '/feed'
  )
}

/**
 * Send a custom notification
 */
export async function notifyCustom(
  walletAddresses: string[],
  title: string,
  message: string,
  miniAppPath?: string
): Promise<boolean> {
  if (walletAddresses.length === 0) return false

  return sendNotification(walletAddresses, title, message, miniAppPath)
}
