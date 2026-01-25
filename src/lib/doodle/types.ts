// Holiday and Theme type definitions for OJO Doodle Logo

export type HolidayId =
  | 'new-year'
  | 'pongal'
  | 'education-day'
  | 'lunar-new-year'
  | 'valentines'
  | 'carnival'
  | 'holi'
  | 'eid'
  | 'health-day'
  | 'earth-day'
  | 'environment-day'
  | 'pride'
  | 'independence-day-us'
  | 'world-id-day'
  | 'halloween'
  | 'diwali'
  | 'thanksgiving'
  | 'christmas'
  | 'default'

export interface Holiday {
  id: HolidayId
  name: string
  description: string
  themeId: ThemeId
  // Date range (month is 1-indexed)
  startMonth: number
  startDay: number
  endMonth?: number
  endDay?: number
  // For calculated dates (like lunar new year)
  calculated?: boolean
}

export type ThemeId =
  | 'default'
  | 'lantern'
  | 'globe'
  | 'heart'
  | 'mask'
  | 'orb'
  | 'pumpkin'
  | 'firework'

export type JVariant = 'default' | 'leaf' | 'heart' | 'sparkle' | 'flame'

export interface Theme {
  id: ThemeId
  eyeComponent: string
  jVariant: JVariant
  colors: {
    primary: string
    secondary: string
    glow: string
  }
  idleAnimation: string
  clickAnimation: string
}

export interface EyeProps {
  size: 'sm' | 'md' | 'lg' | 'xl'
  offset: { x: number; y: number }
  isWinking: boolean
  isClicked: boolean
  shouldAnimate: boolean
  delayed: boolean
  theme: Theme
}

export interface SizeConfig {
  text: string
  eyeOuter: string
  eyeMiddle: string
  eyeInner: string
  coreSize: string
  arcWidth: string
  glowSize: string
  eyeOuterPx: number
  eyeMiddlePx: number
  eyeInnerPx: number
  maxOffset: number
}
