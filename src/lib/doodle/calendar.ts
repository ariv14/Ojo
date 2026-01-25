// Holiday detection and calendar utilities

import { Holiday, HolidayId } from './types'

// Lookup tables for calculated lunar/religious dates (2024-2030)
const lunarNewYearDates: Record<number, [number, number]> = {
  2024: [2, 10],
  2025: [1, 29],
  2026: [2, 17],
  2027: [2, 6],
  2028: [1, 26],
  2029: [2, 13],
  2030: [2, 3],
}

const eidDates: Record<number, [number, number]> = {
  2024: [4, 10],
  2025: [3, 30],
  2026: [3, 20],
  2027: [3, 9],
  2028: [2, 26],
  2029: [2, 14],
  2030: [2, 4],
}

const diwaliDates: Record<number, [number, number]> = {
  2024: [11, 1],
  2025: [10, 20],
  2026: [11, 8],
  2027: [10, 29],
  2028: [10, 17],
  2029: [11, 5],
  2030: [10, 26],
}

const holiDates: Record<number, [number, number]> = {
  2024: [3, 25],
  2025: [3, 14],
  2026: [3, 3],
  2027: [3, 22],
  2028: [3, 11],
  2029: [3, 1],
  2030: [3, 20],
}

// Get Thanksgiving (4th Thursday of November)
function getThanksgiving(year: number): [number, number] {
  const nov1 = new Date(year, 10, 1) // November (0-indexed)
  const firstThursday = (4 - nov1.getDay() + 7) % 7 + 1
  const fourthThursday = firstThursday + 21
  return [11, fourthThursday]
}

// Get Mardi Gras (47 days before Easter)
function getMardiGras(year: number): [number, number] {
  // Calculate Easter using Anonymous Gregorian algorithm
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  // Easter date
  const easter = new Date(year, month - 1, day)
  // Mardi Gras is 47 days before Easter
  easter.setDate(easter.getDate() - 47)
  return [easter.getMonth() + 1, easter.getDate()]
}

// All holidays with their date ranges
const holidays: Holiday[] = [
  // Fixed date holidays
  {
    id: 'new-year',
    name: 'New Year',
    description: "Happy New Year! Here's to new beginnings",
    themeId: 'firework',
    startMonth: 1,
    startDay: 1,
    endMonth: 1,
    endDay: 2,
  },
  {
    id: 'pongal',
    name: 'Pongal',
    description: 'Happy Pongal! Harvest blessings to you',
    themeId: 'lantern',
    startMonth: 1,
    startDay: 14,
    endMonth: 1,
    endDay: 17,
  },
  {
    id: 'education-day',
    name: 'International Day of Education',
    description: 'Knowledge lights the way forward',
    themeId: 'orb',
    startMonth: 1,
    startDay: 24,
  },
  {
    id: 'valentines',
    name: "Valentine's Day",
    description: "Spreading love to all verified humans",
    themeId: 'heart',
    startMonth: 2,
    startDay: 14,
  },
  {
    id: 'health-day',
    name: 'World Health Day',
    description: 'Health is wealth - take care of yourself',
    themeId: 'globe',
    startMonth: 4,
    startDay: 7,
  },
  {
    id: 'earth-day',
    name: 'Earth Day',
    description: "Happy Earth Day! Let's protect our home",
    themeId: 'globe',
    startMonth: 4,
    startDay: 22,
  },
  {
    id: 'environment-day',
    name: 'World Environment Day',
    description: 'One planet, one chance - make it count',
    themeId: 'globe',
    startMonth: 6,
    startDay: 5,
  },
  {
    id: 'pride',
    name: 'Pride Month',
    description: 'Love is love - celebrate authenticity',
    themeId: 'mask',
    startMonth: 6,
    startDay: 1,
    endMonth: 6,
    endDay: 30,
  },
  {
    id: 'independence-day-us',
    name: 'Independence Day',
    description: 'Happy 4th of July!',
    themeId: 'firework',
    startMonth: 7,
    startDay: 4,
  },
  {
    id: 'world-id-day',
    name: 'World ID Day',
    description: 'Celebrating verified humanity worldwide',
    themeId: 'orb',
    startMonth: 7,
    startDay: 24,
  },
  {
    id: 'halloween',
    name: 'Halloween',
    description: "Boo! Don't worry, we're all verified humans here",
    themeId: 'pumpkin',
    startMonth: 10,
    startDay: 31,
  },
  {
    id: 'christmas',
    name: 'Christmas',
    description: 'Merry Christmas! Joy to all verified humans',
    themeId: 'firework',
    startMonth: 12,
    startDay: 24,
    endMonth: 12,
    endDay: 26,
  },
  // Calculated holidays (placeholders, actual dates set at runtime)
  {
    id: 'lunar-new-year',
    name: 'Lunar New Year',
    description: 'Gong Xi Fa Cai! Wishing you prosperity',
    themeId: 'lantern',
    startMonth: 0,
    startDay: 0,
    calculated: true,
  },
  {
    id: 'carnival',
    name: 'Carnival',
    description: "It's Carnival time! Let the party begin",
    themeId: 'mask',
    startMonth: 0,
    startDay: 0,
    calculated: true,
  },
  {
    id: 'holi',
    name: 'Holi',
    description: 'Happy Holi! May your life be colorful',
    themeId: 'mask',
    startMonth: 0,
    startDay: 0,
    calculated: true,
  },
  {
    id: 'eid',
    name: 'Eid al-Fitr',
    description: 'Eid Mubarak! Blessings and joy to you',
    themeId: 'lantern',
    startMonth: 0,
    startDay: 0,
    calculated: true,
  },
  {
    id: 'diwali',
    name: 'Diwali',
    description: 'Happy Diwali! Festival of lights',
    themeId: 'firework',
    startMonth: 0,
    startDay: 0,
    calculated: true,
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    description: 'Grateful for our verified community',
    themeId: 'lantern',
    startMonth: 0,
    startDay: 0,
    calculated: true,
  },
]

// Default "holiday" for regular days
const defaultHoliday: Holiday = {
  id: 'default',
  name: 'OJO',
  description: 'OJO is watching over what is real',
  themeId: 'default',
  startMonth: 0,
  startDay: 0,
}

function getCalculatedHolidayDate(id: HolidayId, year: number): [number, number] | null {
  switch (id) {
    case 'lunar-new-year':
      return lunarNewYearDates[year] || null
    case 'eid':
      return eidDates[year] || null
    case 'diwali':
      return diwaliDates[year] || null
    case 'holi':
      return holiDates[year] || null
    case 'thanksgiving':
      return getThanksgiving(year)
    case 'carnival':
      return getMardiGras(year)
    default:
      return null
  }
}

function isDateInRange(
  month: number,
  day: number,
  startMonth: number,
  startDay: number,
  endMonth?: number,
  endDay?: number
): boolean {
  const start = startMonth * 100 + startDay
  const end = endMonth && endDay ? endMonth * 100 + endDay : start
  const current = month * 100 + day
  return current >= start && current <= end
}

export function getCurrentHoliday(date: Date = new Date()): Holiday {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-indexed
  const day = date.getDate()

  // Check calculated holidays first (they have higher priority for specific dates)
  for (const holiday of holidays.filter(h => h.calculated)) {
    const calcDate = getCalculatedHolidayDate(holiday.id, year)
    if (calcDate) {
      const [startMonth, startDay] = calcDate
      // Most calculated holidays last 2-3 days
      const duration = holiday.id === 'diwali' ? 5 : holiday.id === 'lunar-new-year' ? 15 : 3
      const endDate = new Date(year, startMonth - 1, startDay + duration - 1)
      if (isDateInRange(month, day, startMonth, startDay, endDate.getMonth() + 1, endDate.getDate())) {
        return { ...holiday, startMonth, startDay }
      }
    }
  }

  // Check fixed date holidays
  for (const holiday of holidays.filter(h => !h.calculated)) {
    if (isDateInRange(month, day, holiday.startMonth, holiday.startDay, holiday.endMonth, holiday.endDay)) {
      return holiday
    }
  }

  return defaultHoliday
}

export function getHolidayById(id: HolidayId): Holiday | undefined {
  if (id === 'default') return defaultHoliday
  return holidays.find(h => h.id === id)
}

export function getAllHolidays(): Holiday[] {
  return [defaultHoliday, ...holidays]
}
