// ── Shared types used across the app ──────────────────────────────────────────

export type ReminderType = 'meeting' | 'deadline' | 'focus' | 'break' | 'personal' | 'review' | 'other'

export type FlightSpeed = 'slow' | 'normal' | 'fast' | 'sonic'
export type VerticalPosition = 'top' | 'center' | 'bottom'
export type BannerSize = 'S' | 'M' | 'L' | 'XL'

export interface NotificationSettings {
  speed: FlightSpeed
  verticalPosition: VerticalPosition
  bannerSize: BannerSize
}

export interface Reminder {
  id: string
  name: string
  type: ReminderType
  meetingTime: Date
  offsetsMin: number[]
  createdAt: number
}

export interface Flight {
  id: string
  msg: string
  emoji: string
  label: string
  colorHue: number
  speedPx: number
  yPct: number
  driftAmp: number
  driftPeriod: number
  sizeMult: number
}

export interface DisplayInfo {
  totalBounds: { x: number; y: number; width: number; height: number }
  primaryBounds: { x: number; y: number; width: number; height: number }
}