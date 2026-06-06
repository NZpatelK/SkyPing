import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import plane from './assets/plane.png'
import './App.css'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Reminder {
  id: string
  name: string
  emoji: string
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

// ── Constants ──────────────────────────────────────────────────────────────────

const RANDOM_EMOJIS = [
  '🎯','🚀','⚡','🔔','📅','💡','🌟','🎪','🏆','🔮','📡','🎨',
  '🦋','🌈','🎵','🏄','🎭','🧩','🌊','🎃',
]

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
const pickEmoji = () => RANDOM_EMOJIS[Math.floor(Math.random() * RANDOM_EMOJIS.length)]

function fmt12(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function flightFromReminder(reminder: Reminder, offsetMin: number): Flight {
  const timeStr = fmt12(reminder.meetingTime)
  return {
    id: uid(),
    msg: `${reminder.name}  ·  ${timeStr}`,
    emoji: reminder.emoji,
    label: offsetMin === 1 ? '1 MIN BEFORE' : `${formatOffset(offsetMin).toUpperCase()} BEFORE`,
    colorHue: hueForOffset(offsetMin),
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

// ── Reminder Modal ─────────────────────────────────────────────────────────────

const MODAL_W = 400
const MODAL_H = 480  // tall enough to not clip

function ReminderModal({ onSave, onClose, onTest, displayInfo }: {
  onSave: (r: Omit<Reminder, 'id' | 'createdAt'>) => void
  onClose: () => void
  onTest: (name: string, emoji: string, meetingTime: Date) => void
  displayInfo: DisplayInfo | null
}) {
  const [name, setName] = useState('')
  const [timeInput, setTimeInput] = useState('')
  const [selectedOffsets, setSelectedOffsets] = useState<Set<number>>(new Set())
  const [emoji] = useState(pickEmoji)
  const [error, setError] = useState('')
  const [testCooldown, setTestCooldown] = useState(false)
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Pixel-perfect centre of the primary display within the canvas ────────────
  // totalBounds.x/y = where the canvas starts in screen space (e.g. -1280 on left monitor)
  // primaryBounds.x/y = where the primary display starts in screen space
  // Modal left in canvas coords = (primaryBounds.x - totalBounds.x) + centreOffset
  const modalStyle = (() => {
    if (!displayInfo) {
      // Fallback before IPC arrives — best-effort using window dimensions
      return {
        left: Math.round((window.innerWidth - MODAL_W) / 2),
        top:  Math.round((window.innerHeight - MODAL_H) / 2),
        width: MODAL_W,
      }
    }
    const { totalBounds, primaryBounds } = displayInfo
    // Offset of primary display within the canvas (canvas origin = totalBounds top-left)
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
    if (!name.trim()) { setError('Enter a meeting name.'); return }
    if (!timeInput)   { setError('Set a meeting time.'); return }
    if (minutesUntil !== null && minutesUntil <= 0) { setError('Meeting time is in the past.'); return }
    if (selectedOffsets.size === 0) { setError('Pick at least one reminder time.'); return }
    const meetingTime = getMeetingDate()!
    onSave({ name: name.trim(), emoji, meetingTime, offsetsMin: [...selectedOffsets].sort((a, b) => a - b) })
    onClose()
  }

  // Cleanup cooldown timer on unmount
  useEffect(() => () => {
    if (testTimerRef.current) clearTimeout(testTimerRef.current)
  }, [])

  const handleTest = () => {
    if (testCooldown) return
    const meetingTime = getMeetingDate() ?? new Date(Date.now() + 5 * 60000)
    onTest(name.trim() || 'Test reminder', emoji, meetingTime)
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="modal"
        style={{ position: 'absolute', ...modalStyle }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <span className="modal-emoji">{emoji}</span>
          <div className="modal-header-text">
            <h2 className="modal-title">New Reminder</h2>
            <p className="modal-subtitle">Set meeting time to see notify options</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Meeting name */}
        <div className="modal-field">
          <label className="modal-label">Meeting name</label>
          <input
            className="modal-input"
            type="text"
            placeholder="e.g. Team standup"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        {/* Meeting time — custom selects avoid native picker appearing behind the modal */}
        <div className="modal-field">
          <label className="modal-label">Meeting time</label>
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
              <span className="modal-label-hint"> — meeting is too soon</span>
            )}
          </label>
          {!timeInput ? (
            <p className="modal-hint">Set a meeting time above to see options</p>
          ) : offsetOptions.length === 0 ? (
            <p className="modal-hint">No reminder slots available for this time</p>
          ) : (
            <div className="offset-chips">
              {offsetOptions.map(min => (
                <button
                  key={min}
                  className={`offset-chip ${selectedOffsets.has(min) ? 'selected' : ''}`}
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
            className={`modal-test ${testCooldown ? 'fired' : ''}`}
            onClick={handleTest}
            disabled={testCooldown}
          >
            {testCooldown ? '✈ Sent!' : '▶ Test'}
          </button>
          <button
            className="modal-save"
            onClick={handleSave}
            disabled={!name.trim() || !timeInput || selectedOffsets.size === 0}
          >
            Save reminder
          </button>
        </div>
      </motion.div>
    </div>
  )
}



// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [stage, setStage] = useState({ w: window.innerWidth, h: window.innerHeight })
  // Array of active flights — each flies independently, removes itself when done
  const [flights, setFlights] = useState<Flight[]>([])
  const [showModal, setShowModal] = useState(false)
  const [displayInfo, setDisplayInfo] = useState<DisplayInfo | null>(null)

  const notifTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

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

  // Add a flight to the active array — no queue, all fly simultaneously
  const addFlight = useCallback((f: Flight) => {
    setFlights(prev => [...prev, f])
  }, [])

  // Remove a flight by id when its animation completes
  const removeFlight = useCallback((id: string) => {
    setFlights(prev => prev.filter(f => f.id !== id))
  }, [])

  // Save reminder → schedule timers
  const handleSaveReminder = useCallback((data: Omit<Reminder, 'id' | 'createdAt'>) => {
    const reminder: Reminder = { ...data, id: uid(), createdAt: Date.now() }
    data.offsetsMin.forEach(offsetMin => {
      const fireAt = data.meetingTime.getTime() - offsetMin * 60 * 1000
      const delayMs = fireAt - Date.now()
      if (delayMs <= 0) return
      const t = setTimeout(() => addFlight(flightFromReminder(reminder, offsetMin)), delayMs)
      notifTimersRef.current.push(t)
    })
  }, [addFlight])

  // Test: immediately add a flight
  const handleTestRun = useCallback((name: string, emoji: string, meetingTime: Date) => {
    const testReminder: Reminder = {
      id: uid(), name, emoji, meetingTime, offsetsMin: [5], createdAt: Date.now(),
    }
    addFlight(flightFromReminder(testReminder, 5))
  }, [addFlight])

  useEffect(() => () => {
    notifTimersRef.current.forEach(clearTimeout)
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
          />
        )}
      </AnimatePresence>
    </>
  )
}