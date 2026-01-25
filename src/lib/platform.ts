/**
 * Platform detection utilities for handling Android vs iOS differences
 */

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * Check if scroll position is at the top, with threshold for Android sub-pixel issues.
 * Android WebView often reports sub-pixel scroll positions (0.5, 1.0, 1.5) even when visually at top.
 */
export function isAtScrollTop(threshold?: number): boolean {
  const effectiveThreshold = threshold ?? getScrollTopThreshold()
  return window.scrollY <= effectiveThreshold
}

/**
 * Get the appropriate scroll threshold for the current platform.
 * Android needs a higher threshold due to sub-pixel scroll reporting.
 */
export function getScrollTopThreshold(): number {
  return isAndroid() ? 5 : 1
}
