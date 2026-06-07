import type { ReminderType } from '../types'

// ── Reminder Type Definitions — each type has its own fixed emoji + colour ─────

export const REMINDER_TYPES: Record<ReminderType, { label: string; emoji: string; hue: number; color: string; bg: string; border: string }> = {
  meeting:  { label: 'Meeting',   emoji: '📅', hue: 210, color: 'rgb(96,165,250)',   bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.35)'  },
  deadline: { label: 'Deadline',  emoji: '🔥', hue: 10,  color: 'rgb(251,113,133)',  bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)'   },
  focus:    { label: 'Focus',     emoji: '🎯', hue: 270, color: 'rgb(192,132,252)',  bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.35)'  },
  break:    { label: 'Break',     emoji: '☕', hue: 35,  color: 'rgb(251,191,36)',   bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.35)'  },
  personal: { label: 'Personal',  emoji: '🌿', hue: 145, color: 'rgb(74,222,128)',   bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.35)'   },
  review:   { label: 'Review',    emoji: '📝', hue: 185, color: 'rgb(34,211,238)',   bg: 'rgba(6,182,212,0.15)',   border: 'rgba(6,182,212,0.35)'   },
  other:    { label: 'Other',     emoji: '✨', hue: 300, color: 'rgb(244,114,182)',  bg: 'rgba(236,72,153,0.15)',  border: 'rgba(236,72,153,0.35)'  },
}

// ── Hue values keyed by offset minute for banner colour variance ───────────────

export const HUE_BY_OFFSET: Record<number, number> = {
  1: 195, 2: 140, 3: 200, 4: 160, 5: 140,
  10: 45, 15: 270, 20: 20, 30: 340, 45: 210, 60: 195, 90: 20, 120: 270,
}

// ── Modal dimensions ───────────────────────────────────────────────────────────

export const MODAL_W = 780
export const MODAL_H = 640

// ── Flight / plane banner dimensions ──────────────────────────────────────────

export const PLANE_W = 180
export const BANNER_W = 360
export const ROPE_W = 80
export const TOTAL_W = PLANE_W + ROPE_W + BANNER_W