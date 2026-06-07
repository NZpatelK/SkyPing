import type { Flight, Reminder, ReminderType } from '../types'
import { HUE_BY_OFFSET, REMINDER_TYPES } from '../constants'

// ── ID / random helpers ────────────────────────────────────────────────────────

let counter = 0
export const uid = () => `flight-${++counter}`
export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)

// ── Time formatting ────────────────────────────────────────────────────────────

/** Format a Date as 12-hour time string, e.g. "2:30 PM" */
export function fmt12(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** Format an offset in minutes as a human-readable string */
export function formatOffset(min: number): string {
  if (min < 60) return `${min} min`
  if (min === 60) return '1 hr'
  if (min === 90) return '1.5 hr'
  if (min === 120) return '2 hr'
  return `${min} min`
}

// ── Offset options ─────────────────────────────────────────────────────────────

/** Returns the smart list of offset options based on how far away the meeting is */
export function getOffsetOptions(minutesUntil: number): number[] {
  if (minutesUntil <= 0)   return []
  if (minutesUntil <= 5)   return [1, 2, 3].filter(n => n < minutesUntil)
  if (minutesUntil <= 15)  return [1, 2, 3, 5].filter(n => n < minutesUntil)
  if (minutesUntil <= 30)  return [2, 5, 10, 15].filter(n => n < minutesUntil)
  if (minutesUntil <= 60)  return [5, 10, 15, 20, 30].filter(n => n < minutesUntil)
  if (minutesUntil <= 120) return [5, 10, 15, 30, 45, 60].filter(n => n < minutesUntil)
  return [5, 10, 15, 30, 60, 90, 120].filter(n => n < minutesUntil)
}

// ── Flight factory ─────────────────────────────────────────────────────────────

/** Returns the hue for a given offset minute, falling back to 210 */
export const hueForOffset = (min: number) => HUE_BY_OFFSET[min] ?? 210

/** Build a Flight object from a Reminder + which offset is firing */
export function flightFromReminder(reminder: Reminder, offsetMin: number): Flight {
  const typeInfo = REMINDER_TYPES[reminder.type]
  const timeStr = fmt12(reminder.meetingTime)
  return {
    id: uid(),
    msg: `${reminder.name}  ·  ${timeStr}`,
    emoji: typeInfo.emoji,
    label: offsetMin === 1 ? '1 MIN BEFORE' : `${formatOffset(offsetMin).toUpperCase()} BEFORE`,
    colorHue: typeInfo.hue,
    speedPx: rand(110, 200),
    yPct: rand(10, 35),
    driftAmp: rand(12, 28),
    driftPeriod: rand(3, 5),
  }
}

// ── Reminder type helpers ──────────────────────────────────────────────────────

/** Returns typed keys of REMINDER_TYPES */
export const reminderTypeKeys = () => Object.keys(REMINDER_TYPES) as ReminderType[]
