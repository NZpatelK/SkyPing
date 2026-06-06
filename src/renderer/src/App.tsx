import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import plane from './assets/plane.png'
import './App.css'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ReminderType = 'meeting' | 'deadline' | 'focus' | 'break' | 'personal' | 'review' | 'other'

interface Reminder {
  id: string
  name: string
  type: ReminderType
  meetingTime: Date
  offsetsMin: number[]
  createdAt: number
}

interface Flight {
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

interface DisplayInfo {
  totalBounds: { x: number; y: number; width: number; height: number }
  primaryBounds: { x: number; y: number; width: number; height: number }
}

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

// ── Constants ──────────────────────────────────────────────────────────────────

const HUE_BY_OFFSET: Record<number, number> = {
  1: 195, 2: 140, 3: 200, 4: 160, 5: 140,
  10: 45, 15: 270, 20: 20, 30: 340, 45: 210, 60: 195, 90: 20, 120: 270,
}
const hueForOffset = (min: number) => HUE_BY_OFFSET[min] ?? 210

// ── Smart offset options ───────────────────────────────────────────────────────

function getOffsetOptions(minutesUntil: number): number[] {
  if (minutesUntil <= 0)   return []
  if (minutesUntil <= 5)   return [1, 2, 3].filter(n => n < minutesUntil)
  if (minutesUntil <= 15)  return [1, 2, 3, 5].filter(n => n < minutesUntil)
  if (minutesUntil <= 30)  return [2, 5, 10, 15].filter(n => n < minutesUntil)
  if (minutesUntil <= 60)  return [5, 10, 15, 20, 30].filter(n => n < minutesUntil)
  if (minutesUntil <= 120) return [5, 10, 15, 30, 45, 60].filter(n => n < minutesUntil)
  return [5, 10, 15, 30, 60, 90, 120].filter(n => n < minutesUntil)
}

function formatOffset(min: number): string {
  if (min < 60) return `${min} min`
  if (min === 60) return '1 hr'
  if (min === 90) return '1.5 hr'
  if (min === 120) return '2 hr'
  return `${min} min`
}

// ── Helpers ────────────────────────────────────────────────────────────────────

let counter = 0
const uid = () => `flight-${++counter}`
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)

function fmt12(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function flightFromReminder(reminder: Reminder, offsetMin: number): Flight {
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

// ── Plane + Banner ─────────────────────────────────────────────────────────────

const PLANE_W = 180
const BANNER_W = 360
const ROPE_W = 80
const TOTAL_W = PLANE_W + ROPE_W + BANNER_W

function SingleFlight({ flight, stageW, stageH, onDone }: {
  flight: Flight; stageW: number; stageH: number; onDone: (id: string) => void
}) {
  const startX = -TOTAL_W - 20
  const endX = stageW + 20
  const duration = (endX - startX) / flight.speedPx
  const yPx = (flight.yPct / 100) * stageH
  const yFrames = [0, -flight.driftAmp, flight.driftAmp * 0.6, -flight.driftAmp * 0.4, flight.driftAmp, 0]

  return (
    <motion.div
      className="flight-wrapper"
      style={{ top: yPx }}
      initial={{ x: startX, opacity: 0 }}
      animate={{ x: [startX, endX], y: yFrames, opacity: [0, 1, 1, 1, 1, 1, 0] }}
      transition={{
        x: { duration, ease: 'linear' },
        y: { duration: flight.driftPeriod, repeat: Infinity, ease: 'easeInOut' },
        opacity: { duration, ease: 'linear', times: [0, 0.05, 0.15, 0.5, 0.85, 0.95, 1] },
      }}
      onAnimationComplete={() => onDone(flight.id)}
    >
      <div className="flight-rig">
        <div className="banner" style={{
          background: `linear-gradient(135deg,
            hsl(${flight.colorHue}, 90%, 55%) 0%,
            hsl(${flight.colorHue}, 80%, 38%) 100%)`
        }}>
          <span className="banner-emoji">{flight.emoji}</span>
          <div className="banner-text">
            <span className="banner-label">{flight.label}</span>
            <span className="banner-msg">{flight.msg}</span>
          </div>
        </div>
        <div className="rope" />
        <div className="plane-wrap">
          <img src={plane} alt="plane" className="plane-img" />
        </div>
      </div>
    </motion.div>
  )
}

// ── Edit Reminder Modal (inline within the panel) ──────────────────────────────

function EditReminderRow({ reminder, onSave, onCancel }: {
  reminder: Reminder
  onSave: (updated: Reminder) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(reminder.name)
  const [type, setType] = useState<ReminderType>(reminder.type)
  const [timeInput, setTimeInput] = useState(() => {
    const d = new Date(reminder.meetingTime)
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  })
  const [selectedOffsets, setSelectedOffsets] = useState<Set<number>>(new Set(reminder.offsetsMin))

  const minutesUntil = (() => {
    if (!timeInput) return null
    const [hh, mm] = timeInput.split(':').map(Number)
    const now = new Date()
    const meeting = new Date()
    meeting.setHours(hh, mm, 0, 0)
    if (meeting <= now) meeting.setDate(meeting.getDate() + 1)
    return Math.floor((meeting.getTime() - now.getTime()) / 60000)
  })()

  const offsetOptions = minutesUntil !== null ? getOffsetOptions(minutesUntil) : []

  const toggleOffset = (min: number) => {
    setSelectedOffsets(prev => {
      const next = new Set(prev)
      next.has(min) ? next.delete(min) : next.add(min)
      return next
    })
  }

  const handleSave = () => {
    if (!name.trim() || !timeInput || selectedOffsets.size === 0) return
    const [hh, mm] = timeInput.split(':').map(Number)
    const d = new Date()
    d.setHours(hh, mm, 0, 0)
    if (d <= new Date()) d.setDate(d.getDate() + 1)
    onSave({ ...reminder, name: name.trim(), type, meetingTime: d, offsetsMin: [...selectedOffsets].sort((a,b) => a-b) })
  }

  const typeInfo = REMINDER_TYPES[type]

  return (
    <div className="edit-row">
      <input
        className="edit-input"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Reminder name"
        autoFocus
      />
      <div className="edit-type-row">
        {(Object.keys(REMINDER_TYPES) as ReminderType[]).map(t => {
          const ti = REMINDER_TYPES[t]
          const sel = type === t
          return (
            <button
              key={t}
              className={`edit-type-chip ${sel ? 'selected' : ''}`}
              style={sel ? { background: ti.bg, borderColor: ti.border, color: ti.color } : {}}
              onClick={() => setType(t)}
              title={ti.label}
            >
              {ti.emoji}
            </button>
          )
        })}
      </div>
      <div className="edit-time-row">
        <select
          className="edit-select"
          value={timeInput.split(':')[0]}
          onChange={e => setTimeInput(`${e.target.value}:${timeInput.split(':')[1] ?? '00'}`)}
        >
          {Array.from({ length: 24 }, (_, i) => String(i).padStart(2,'0')).map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>:</span>
        <select
          className="edit-select"
          value={timeInput.split(':')[1] ?? '00'}
          onChange={e => setTimeInput(`${timeInput.split(':')[0]}:${e.target.value}`)}
        >
          {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      {offsetOptions.length > 0 && (
        <div className="edit-offset-chips">
          {offsetOptions.map(min => (
            <button
              key={min}
              className={`offset-chip small ${selectedOffsets.has(min) ? 'selected' : ''}`}
              onClick={() => toggleOffset(min)}
            >
              {formatOffset(min)}
            </button>
          ))}
        </div>
      )}
      <div className="edit-actions">
        <button className="edit-cancel" onClick={onCancel}>Cancel</button>
        <button
          className="edit-save"
          onClick={handleSave}
          style={{ background: typeInfo.color, color: '#000' }}
          disabled={!name.trim() || !timeInput || selectedOffsets.size === 0}
        >
          Save
        </button>
      </div>
    </div>
  )
}

// ── Active Reminders Panel ─────────────────────────────────────────────────────

function ActiveRemindersPanel({ reminders, onEdit, onDelete }: {
  reminders: Reminder[]
  onEdit: (updated: Reminder) => void
  onDelete: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const upcoming = reminders
    .filter(r => r.meetingTime.getTime() > Date.now())
    .sort((a, b) => a.meetingTime.getTime() - b.meetingTime.getTime())

  return (
    <div className="active-panel">
      <div className="active-panel-header">
        <span className="active-panel-title">Active Reminders</span>
        <span className="active-panel-count">{upcoming.length}</span>
      </div>

      {upcoming.length === 0 ? (
        <div className="active-panel-empty">
          <span className="active-panel-empty-icon">🗓️</span>
          <p>No active reminders</p>
          <p>Save one on the left</p>
        </div>
      ) : (
        <div className="active-list">
          {upcoming.map(r => {
            const typeInfo = REMINDER_TYPES[r.type]
            const isEditing = editingId === r.id

            if (isEditing) {
              return (
                <EditReminderRow
                  key={r.id}
                  reminder={r}
                  onSave={updated => { onEdit(updated); setEditingId(null) }}
                  onCancel={() => setEditingId(null)}
                />
              )
            }

            const minsLeft = Math.floor((r.meetingTime.getTime() - Date.now()) / 60000)
            const timeLabel = minsLeft < 60
              ? `${minsLeft}m`
              : `${Math.floor(minsLeft/60)}h ${minsLeft%60 > 0 ? `${minsLeft%60}m` : ''}`

            return (
              <div key={r.id} className="active-item">
                <div
                  className="active-item-type-dot"
                  style={{ background: typeInfo.color }}
                  title={typeInfo.label}
                >
                  {typeInfo.emoji}
                </div>
                <div className="active-item-body">
                  <div className="active-item-name">{r.name}</div>
                  <div className="active-item-meta">
                    <span
                      className="active-item-type-badge"
                      style={{ color: typeInfo.color, background: typeInfo.bg, borderColor: typeInfo.border }}
                    >
                      {typeInfo.label}
                    </span>
                    <span className="active-item-time">{fmt12(r.meetingTime)}</span>
                    <span className="active-item-countdown">{timeLabel} away</span>
                  </div>
                  <div className="active-item-offsets">
                    {r.offsetsMin.map(o => (
                      <span key={o} className="active-item-offset-pill">{formatOffset(o)}</span>
                    ))}
                  </div>
                </div>
                <div className="active-item-actions">
                  <button
                    className="active-item-btn edit"
                    onClick={() => setEditingId(r.id)}
                    title="Edit"
                  >✏️</button>
                  <button
                    className="active-item-btn delete"
                    onClick={() => onDelete(r.id)}
                    title="Delete"
                  >🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Reminder Modal ─────────────────────────────────────────────────────────────

// Wider to accommodate two-column layout
const MODAL_W = 780
const MODAL_H = 520

function ReminderModal({ onSave, onClose, onTest, displayInfo, reminders, onEdit, onDelete }: {
  onSave: (r: Omit<Reminder, 'id' | 'createdAt'>) => void
  onClose: () => void
  onTest: (name: string, type: ReminderType, meetingTime: Date) => void
  displayInfo: DisplayInfo | null
  reminders: Reminder[]
  onEdit: (updated: Reminder) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [reminderType, setReminderType] = useState<ReminderType>('meeting')
  const [timeInput, setTimeInput] = useState('')
  const [selectedOffsets, setSelectedOffsets] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [testCooldown, setTestCooldown] = useState(false)
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Pixel-perfect centre of the primary display within the canvas ────────────
  const modalStyle = (() => {
    if (!displayInfo) {
      return {
        left: Math.round((window.innerWidth - MODAL_W) / 2),
        top:  Math.round((window.innerHeight - MODAL_H) / 2),
        width: MODAL_W,
      }
    }
    const { totalBounds, primaryBounds } = displayInfo
    const canvasOffsetX = primaryBounds.x - totalBounds.x
    const canvasOffsetY = primaryBounds.y - totalBounds.y
    return {
      left: Math.round(canvasOffsetX + (primaryBounds.width  - MODAL_W) / 2),
      top:  Math.round(canvasOffsetY + (primaryBounds.height - MODAL_H) / 2),
      width: MODAL_W,
    }
  })()

  // ── Derived state ────────────────────────────────────────────────────────────
  const minutesUntil = (() => {
    if (!timeInput) return null
    const [hh, mm] = timeInput.split(':').map(Number)
    const now = new Date()
    const meeting = new Date()
    meeting.setHours(hh, mm, 0, 0)
    if (meeting <= now) meeting.setDate(meeting.getDate() + 1)
    return Math.floor((meeting.getTime() - now.getTime()) / 60000)
  })()

  const offsetOptions = minutesUntil !== null ? getOffsetOptions(minutesUntil) : []

  const prevTimeRef = useRef(timeInput)
  useEffect(() => {
    if (prevTimeRef.current !== timeInput) {
      prevTimeRef.current = timeInput
      setSelectedOffsets(prev => new Set([...prev].filter(o => offsetOptions.includes(o))))
    }
  }, [timeInput, offsetOptions])

  const toggleOffset = (min: number) => {
    setSelectedOffsets(prev => {
      const next = new Set(prev)
      next.has(min) ? next.delete(min) : next.add(min)
      return next
    })
  }

  const getMeetingDate = (): Date | null => {
    if (!timeInput) return null
    const [hh, mm] = timeInput.split(':').map(Number)
    const d = new Date()
    d.setHours(hh, mm, 0, 0)
    if (d <= new Date()) d.setDate(d.getDate() + 1)
    return d
  }

  const handleSave = () => {
    if (!name.trim()) { setError('Enter a reminder name.'); return }
    if (!timeInput)   { setError('Set a time.'); return }
    if (minutesUntil !== null && minutesUntil <= 0) { setError('Time is in the past.'); return }
    if (selectedOffsets.size === 0) { setError('Pick at least one reminder time.'); return }
    const meetingTime = getMeetingDate()!
    onSave({ name: name.trim(), type: reminderType, meetingTime, offsetsMin: [...selectedOffsets].sort((a, b) => a - b) })
    // Reset form
    setName(''); setTimeInput(''); setSelectedOffsets(new Set()); setReminderType('meeting'); setError('')
  }

  // Cleanup cooldown timer on unmount
  useEffect(() => () => {
    if (testTimerRef.current) clearTimeout(testTimerRef.current)
  }, [])

  const handleTest = () => {
    if (testCooldown) return
    const meetingTime = getMeetingDate() ?? new Date(Date.now() + 5 * 60000)
    // Show "Test - {name}" if name is filled, else "Test - Reminder"
    const displayName = name.trim() ? `Test - ${name.trim()}` : 'Test - Reminder'
    onTest(displayName, reminderType, meetingTime)
    setTestCooldown(true)
    if (testTimerRef.current) clearTimeout(testTimerRef.current)
    testTimerRef.current = setTimeout(() => {
      setTestCooldown(false)
      testTimerRef.current = null
    }, 3000)
  }

  const formatTimeLeft = (mins: number) => {
    if (mins < 60) return `${mins}m away`
    const h = Math.floor(mins / 60), m = mins % 60
    return m === 0 ? `${h}h away` : `${h}h ${m}m away`
  }

  const selectedTypeInfo = REMINDER_TYPES[reminderType]
  // Test button is active when name is filled AND type is selected (type always has a value)
  const canTest = name.trim().length > 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="modal modal--wide"
        style={{ position: 'absolute', ...modalStyle }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-columns">
          {/* ── LEFT: New Reminder Form ── */}
          <div className="modal-left">
            {/* Header */}
            <div className="modal-header">
              <span className="modal-emoji">{selectedTypeInfo.emoji}</span>
              <div className="modal-header-text">
                <h2 className="modal-title">New Reminder</h2>
                <p className="modal-subtitle">Set time to see notify options</p>
              </div>
              <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
            </div>

            {/* Reminder type selector */}
            <div className="modal-field">
              <label className="modal-label">Reminder type</label>
              <div className="type-grid">
                {(Object.keys(REMINDER_TYPES) as ReminderType[]).map(t => {
                  const ti = REMINDER_TYPES[t]
                  const sel = reminderType === t
                  return (
                    <button
                      key={t}
                      className={`type-chip ${sel ? 'selected' : ''}`}
                      style={sel ? { background: ti.bg, borderColor: ti.border, color: ti.color } : {}}
                      onClick={() => { setReminderType(t); setError('') }}
                    >
                      <span className="type-chip-emoji">{ti.emoji}</span>
                      <span className="type-chip-label">{ti.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Meeting name */}
            <div className="modal-field">
              <label className="modal-label">Name</label>
              <input
                className="modal-input"
                type="text"
                placeholder={`e.g. Team standup`}
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>

            {/* Time selects */}
            <div className="modal-field">
              <label className="modal-label">Time</label>
              <div className="modal-time-row">
                <div className="modal-time-selects">
                  <select
                    className="modal-select"
                    value={timeInput ? timeInput.split(':')[0] : ''}
                    onChange={e => {
                      const hh = e.target.value
                      const mm = timeInput ? timeInput.split(':')[1] ?? '00' : '00'
                      setTimeInput(hh ? `${hh}:${mm}` : '')
                      setError('')
                    }}
                  >
                    <option value="">HH</option>
                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="modal-time-colon">:</span>
                  <select
                    className="modal-select"
                    value={timeInput ? timeInput.split(':')[1] ?? '' : ''}
                    onChange={e => {
                      const mm = e.target.value
                      const hh = timeInput ? timeInput.split(':')[0] ?? '00' : '00'
                      setTimeInput(mm !== '' ? `${hh}:${mm}` : '')
                      setError('')
                    }}
                  >
                    <option value="">MM</option>
                    {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                {minutesUntil !== null && minutesUntil > 0 && (
                  <span className="modal-time-badge">{formatTimeLeft(minutesUntil)}</span>
                )}
                {minutesUntil !== null && minutesUntil <= 0 && (
                  <span className="modal-time-badge modal-time-badge--warn">In the past</span>
                )}
              </div>
            </div>

            {/* Offset chips */}
            <div className="modal-field">
              <label className="modal-label">
                Remind me before
                {offsetOptions.length === 0 && timeInput && minutesUntil !== null && minutesUntil > 0 && (
                  <span className="modal-label-hint"> — too soon</span>
                )}
              </label>
              {!timeInput ? (
                <p className="modal-hint">Set a time above to see options</p>
              ) : offsetOptions.length === 0 ? (
                <p className="modal-hint">No slots available for this time</p>
              ) : (
                <div className="offset-chips">
                  {offsetOptions.map(min => (
                    <button
                      key={min}
                      className={`offset-chip ${selectedOffsets.has(min) ? 'selected' : ''}`}
                      style={selectedOffsets.has(min) ? { background: selectedTypeInfo.color, borderColor: selectedTypeInfo.color, color: '#000' } : {}}
                      onClick={() => toggleOffset(min)}
                    >
                      {formatOffset(min)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="modal-error">{error}</p>}

            {/* Buttons */}
            <div className="modal-actions">
              <button
                className={`modal-test ${testCooldown ? 'fired' : ''} ${!canTest ? 'dimmed' : ''}`}
                onClick={handleTest}
                disabled={testCooldown}
                title={canTest ? `Test as "Test - ${name.trim()}"` : 'Enter a name to test'}
              >
                {testCooldown ? '✈ Sent!' : '▶ Test'}
              </button>
              <button
                className="modal-save"
                onClick={handleSave}
                disabled={!name.trim() || !timeInput || selectedOffsets.size === 0}
                style={name.trim() && timeInput && selectedOffsets.size > 0
                  ? { background: selectedTypeInfo.color, color: '#000' }
                  : {}}
              >
                Save reminder
              </button>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="modal-divider" />

          {/* ── RIGHT: Active Reminders ── */}
          <ActiveRemindersPanel
            reminders={reminders}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </motion.div>
    </div>
  )
}



// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [stage, setStage] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [flights, setFlights] = useState<Flight[]>([])
  const [showModal, setShowModal] = useState(false)
  const [displayInfo, setDisplayInfo] = useState<DisplayInfo | null>(null)
  // All reminders — persisted in memory (extend to localStorage/IPC if needed)
  const [reminders, setReminders] = useState<Reminder[]>([])

  const notifTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map())

  // Stage sizing + capture display info for modal centering
  useEffect(() => {
    const update = () => setStage({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', update)
    if (window.electronAPI) {
      const cleanup = window.electronAPI.onDisplayInfo((info: any) => {
        setStage({ w: info.totalBounds.width, h: info.totalBounds.height })
        if (info.primaryBounds) {
          setDisplayInfo({ totalBounds: info.totalBounds, primaryBounds: info.primaryBounds })
        }
      })
      window.electronAPI.getDisplayInfo?.().then((info: any) => {
        if (info?.primaryBounds) {
          setDisplayInfo({ totalBounds: info.totalBounds, primaryBounds: info.primaryBounds })
        }
      })
      return () => { cleanup(); window.removeEventListener('resize', update) }
    }
    return () => window.removeEventListener('resize', update)
  }, [])

  // IPC: open modal
  useEffect(() => {
    if (!window.electronAPI?.onOpenReminderModal) return
    const cleanup = window.electronAPI.onOpenReminderModal(() => setShowModal(true))
    return cleanup
  }, [])

  const closeModal = useCallback(() => {
    setShowModal(false)
    window.electronAPI?.notifyModalClosed?.()
  }, [])

  const addFlight = useCallback((f: Flight) => {
    setFlights(prev => [...prev, f])
  }, [])

  const removeFlight = useCallback((id: string) => {
    setFlights(prev => prev.filter(f => f.id !== id))
  }, [])

  // Schedule notification timers for a reminder
  const scheduleReminder = useCallback((reminder: Reminder) => {
    const timers: ReturnType<typeof setTimeout>[] = []
    reminder.offsetsMin.forEach(offsetMin => {
      const fireAt = reminder.meetingTime.getTime() - offsetMin * 60 * 1000
      const delayMs = fireAt - Date.now()
      if (delayMs <= 0) return
      const t = setTimeout(() => addFlight(flightFromReminder(reminder, offsetMin)), delayMs)
      timers.push(t)
    })
    notifTimersRef.current.set(reminder.id, timers)
  }, [addFlight])

  // Cancel all timers for a reminder
  const cancelReminder = useCallback((id: string) => {
    const timers = notifTimersRef.current.get(id) ?? []
    timers.forEach(clearTimeout)
    notifTimersRef.current.delete(id)
  }, [])

  // Save new reminder → schedule timers
  const handleSaveReminder = useCallback((data: Omit<Reminder, 'id' | 'createdAt'>) => {
    const reminder: Reminder = { ...data, id: uid(), createdAt: Date.now() }
    setReminders(prev => [...prev, reminder])
    scheduleReminder(reminder)
  }, [scheduleReminder])

  // Edit existing reminder → reschedule
  const handleEditReminder = useCallback((updated: Reminder) => {
    cancelReminder(updated.id)
    setReminders(prev => prev.map(r => r.id === updated.id ? updated : r))
    scheduleReminder(updated)
  }, [cancelReminder, scheduleReminder])

  // Delete reminder → cancel timers
  const handleDeleteReminder = useCallback((id: string) => {
    cancelReminder(id)
    setReminders(prev => prev.filter(r => r.id !== id))
  }, [cancelReminder])

  // Test: immediately add a flight with "Test - {name}" label
  const handleTestRun = useCallback((name: string, type: ReminderType, meetingTime: Date) => {
    const testReminder: Reminder = {
      id: uid(), name, type, meetingTime, offsetsMin: [5], createdAt: Date.now(),
    }
    addFlight(flightFromReminder(testReminder, 5))
  }, [addFlight])

  useEffect(() => () => {
    notifTimersRef.current.forEach(timers => timers.forEach(clearTimeout))
  }, [])

  return (
    <>
      <div className="overlay-stage">
        <AnimatePresence>
          {flights.map(f => (
            <SingleFlight
              key={f.id}
              flight={f}
              stageW={stage.w}
              stageH={stage.h}
              onDone={removeFlight}
            />
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showModal && (
          <ReminderModal
            onSave={handleSaveReminder}
            onClose={closeModal}
            onTest={handleTestRun}
            displayInfo={displayInfo}
            reminders={reminders}
            onEdit={handleEditReminder}
            onDelete={handleDeleteReminder}
          />
        )}
      </AnimatePresence>
    </>
  )
}