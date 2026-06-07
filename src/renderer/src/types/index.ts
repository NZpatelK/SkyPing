// ── Shared types used across the app ──────────────────────────────────────────

export type ReminderType = 'meeting' | 'deadline' | 'focus' | 'break' | 'personal' | 'review' | 'other'

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
}

export interface DisplayInfo {
  totalBounds: { x: number; y: number; width: number; height: number }
  primaryBounds: { x: number; y: number; width: number; height: number }
}
