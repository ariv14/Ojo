import { MiniKit } from '@worldcoin/minikit-js'

/**
 * Haptic feedback utility for MiniKit
 * Provides tactile feedback for various user interactions
 */

type ImpactStyle = 'light' | 'medium' | 'heavy'
type NotificationStyle = 'success' | 'warning' | 'error'

/**
 * Send impact haptic feedback
 */
function sendImpact(style: ImpactStyle) {
  if (!MiniKit.isInstalled()) return
  try {
    MiniKit.commands.sendHapticFeedback({
      hapticsType: 'impact',
      style,
    })
  } catch (err) {
    // Silently fail if haptics not supported
    console.debug('Haptic feedback not available:', err)
  }
}

/**
 * Send notification haptic feedback
 */
function sendNotification(style: NotificationStyle) {
  if (!MiniKit.isInstalled()) return
  try {
    MiniKit.commands.sendHapticFeedback({
      hapticsType: 'notification',
      style,
    })
  } catch (err) {
    // Silently fail if haptics not supported
    console.debug('Haptic feedback not available:', err)
  }
}

/**
 * Send selection changed haptic feedback
 */
function sendSelectionChanged() {
  if (!MiniKit.isInstalled()) return
  try {
    MiniKit.commands.sendHapticFeedback({
      hapticsType: 'selection-changed',
    })
  } catch (err) {
    // Silently fail if haptics not supported
    console.debug('Haptic feedback not available:', err)
  }
}

/**
 * Light tap - for votes, toggles, and light interactions
 */
export function hapticLight() {
  sendImpact('light')
}

/**
 * Medium tap - for follows, important actions
 */
export function hapticMedium() {
  sendImpact('medium')
}

/**
 * Heavy tap - for significant actions
 */
export function hapticHeavy() {
  sendImpact('heavy')
}

/**
 * Success feedback - for completed payments, successful actions
 */
export function hapticSuccess() {
  sendNotification('success')
}

/**
 * Warning feedback - for warnings, confirmations
 */
export function hapticWarning() {
  sendNotification('warning')
}

/**
 * Error feedback - for failed actions
 */
export function hapticError() {
  sendNotification('error')
}

/**
 * Selection changed - for pull-to-refresh threshold, slider changes
 */
export function hapticSelection() {
  sendSelectionChanged()
}
