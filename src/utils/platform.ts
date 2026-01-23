/**
 * Platform detection and video format utilities
 * Centralized detection for iOS, Android, Safari, WebView environments
 */

export interface PlatformInfo {
  isIOS: boolean
  isSafari: boolean
  isAndroid: boolean
  isWebView: boolean
  needsMP4: boolean
  supportedVideoMimeType: string | null
}

/**
 * Detects the current platform and its capabilities
 */
export function getPlatformInfo(): PlatformInfo {
  if (typeof navigator === 'undefined') {
    return {
      isIOS: false,
      isSafari: false,
      isAndroid: false,
      isWebView: false,
      needsMP4: false,
      supportedVideoMimeType: null,
    }
  }

  const ua = navigator.userAgent

  // iOS detection (includes iPad with desktop mode)
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  // Safari detection (excludes Chrome/Firefox on iOS which use Safari's engine anyway)
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)

  // Android detection
  const isAndroid = /android/i.test(ua)

  // WebView detection (World App, Facebook, Instagram, etc.)
  const isWebView =
    /FBAN|FBAV|Instagram|Twitter|Line|wv|WebView/i.test(ua) ||
    // World App WebView detection
    /WorldApp/i.test(ua) ||
    // Generic WebView detection for iOS
    (isIOS && !isSafari && !/CriOS|FxiOS|EdgiOS/.test(ua)) ||
    // Generic WebView detection for Android
    (isAndroid && /wv/.test(ua))

  // iOS and Safari need MP4 (webm won't play back)
  const needsMP4 = isIOS || isSafari

  // Get supported MIME type for recording
  const supportedVideoMimeType = getSupportedMimeType(needsMP4)

  return {
    isIOS,
    isSafari,
    isAndroid,
    isWebView,
    needsMP4,
    supportedVideoMimeType,
  }
}

/**
 * Gets the best supported MIME type for video recording
 */
function getSupportedMimeType(needsMP4: boolean): string | null {
  if (typeof MediaRecorder === 'undefined') {
    return null
  }

  // iOS/Safari: MP4 only (webm won't play back)
  // Android/Chrome: webm preferred (better compression), mp4 fallback
  // Prioritize formats with explicit audio codec (mp4a.40.2 or aac) to ensure audio is recorded
  const types = needsMP4
    ? ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1,aac', 'video/mp4']
    : [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return null
}

/**
 * Returns the appropriate file extension for a video
 * Always returns .mp4 on iOS regardless of MIME type (iOS WebView may return empty blob.type)
 */
export function getVideoFileExtension(
  mimeType: string | undefined,
  platform?: PlatformInfo
): string {
  const info = platform || getPlatformInfo()

  // iOS: always use .mp4 - WebView sometimes returns empty blob.type
  if (info.isIOS || info.isSafari) {
    return 'mp4'
  }

  // Use MIME type if available
  if (mimeType) {
    if (mimeType.includes('webm')) return 'webm'
    if (mimeType.includes('mp4')) return 'mp4'
  }

  // Default to mp4 as it's more universally supported
  return 'mp4'
}

/**
 * Returns the appropriate MIME type for a video blob
 * Ensures a valid MIME type is always returned
 */
export function getVideoMimeType(
  blobType: string | undefined,
  platform?: PlatformInfo
): string {
  const info = platform || getPlatformInfo()

  // iOS: always use video/mp4
  if (info.isIOS || info.isSafari) {
    return 'video/mp4'
  }

  // Use blob type if valid
  if (blobType && blobType.startsWith('video/')) {
    return blobType.split(';')[0] // Remove codec info
  }

  // Default to mp4
  return 'video/mp4'
}
