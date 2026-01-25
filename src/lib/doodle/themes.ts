// Theme definitions mapping holidays to visual styles

import { Theme, ThemeId, HolidayId } from './types'

export const themes: Record<ThemeId, Theme> = {
  default: {
    id: 'default',
    eyeComponent: 'DefaultEye',
    jVariant: 'default',
    colors: {
      primary: '#00FFFF',
      secondary: '#0080FF',
      glow: 'rgba(0, 255, 255, 0.5)',
    },
    idleAnimation: 'doodle-idle-pulse',
    clickAnimation: 'doodle-click-spin',
  },
  lantern: {
    id: 'lantern',
    eyeComponent: 'LanternEye',
    jVariant: 'sparkle',
    colors: {
      primary: '#FF4444',
      secondary: '#FFD700',
      glow: 'rgba(255, 68, 68, 0.5)',
    },
    idleAnimation: 'doodle-idle-flicker',
    clickAnimation: 'doodle-click-glow',
  },
  globe: {
    id: 'globe',
    eyeComponent: 'GlobeEye',
    jVariant: 'leaf',
    colors: {
      primary: '#22C55E',
      secondary: '#3B82F6',
      glow: 'rgba(34, 197, 94, 0.5)',
    },
    idleAnimation: 'doodle-idle-spin-slow',
    clickAnimation: 'doodle-click-spin',
  },
  heart: {
    id: 'heart',
    eyeComponent: 'HeartEye',
    jVariant: 'heart',
    colors: {
      primary: '#EC4899',
      secondary: '#F472B6',
      glow: 'rgba(236, 72, 153, 0.5)',
    },
    idleAnimation: 'doodle-idle-bounce',
    clickAnimation: 'doodle-click-explode',
  },
  mask: {
    id: 'mask',
    eyeComponent: 'MaskEye',
    jVariant: 'sparkle',
    colors: {
      primary: '#A855F7',
      secondary: '#F59E0B',
      glow: 'rgba(168, 85, 247, 0.5)',
    },
    idleAnimation: 'doodle-idle-bob',
    clickAnimation: 'doodle-click-spin',
  },
  orb: {
    id: 'orb',
    eyeComponent: 'OrbEye',
    jVariant: 'sparkle',
    colors: {
      primary: '#8B5CF6',
      secondary: '#06B6D4',
      glow: 'rgba(139, 92, 246, 0.5)',
    },
    idleAnimation: 'doodle-idle-pulse',
    clickAnimation: 'doodle-click-glow',
  },
  pumpkin: {
    id: 'pumpkin',
    eyeComponent: 'PumpkinEye',
    jVariant: 'flame',
    colors: {
      primary: '#F97316',
      secondary: '#84CC16',
      glow: 'rgba(249, 115, 22, 0.5)',
    },
    idleAnimation: 'doodle-idle-flicker',
    clickAnimation: 'doodle-click-glow',
  },
  firework: {
    id: 'firework',
    eyeComponent: 'FireworkEye',
    jVariant: 'sparkle',
    colors: {
      primary: '#FBBF24',
      secondary: '#EF4444',
      glow: 'rgba(251, 191, 36, 0.5)',
    },
    idleAnimation: 'doodle-idle-bounce',
    clickAnimation: 'doodle-click-explode',
  },
}

export function getThemeById(id: ThemeId): Theme {
  return themes[id] || themes.default
}

export function getThemeForHoliday(holidayId: HolidayId): Theme {
  const holidayThemeMap: Record<HolidayId, ThemeId> = {
    default: 'default',
    'new-year': 'firework',
    pongal: 'lantern',
    'education-day': 'orb',
    'lunar-new-year': 'lantern',
    valentines: 'heart',
    carnival: 'mask',
    holi: 'mask',
    eid: 'lantern',
    'health-day': 'globe',
    'earth-day': 'globe',
    'environment-day': 'globe',
    pride: 'mask',
    'independence-day-us': 'firework',
    'world-id-day': 'orb',
    halloween: 'pumpkin',
    diwali: 'firework',
    thanksgiving: 'lantern',
    christmas: 'firework',
  }

  return themes[holidayThemeMap[holidayId]] || themes.default
}
