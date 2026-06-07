import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { DisplayInfo, Reminder, ReminderType } from '../../types'
import { REMINDER_TYPES, MODAL_W, MODAL_H } from '../../constants'
import { getOffsetOptions, formatOffset, reminderTypeKeys } from '../../utils'
import { ActiveRemindersPanel } from '../reminders/ActiveRemindersPanel'

interface ReminderModalProps {
  onSave: (r: Omit<Reminder, 'id' | 'createdAt'>) => void
  onClose: () => void
  onTest: (name: string, type: ReminderType, meetingTime: Date) => void
  displayInfo: DisplayInfo | null
  reminders: Reminder[]
  onEdit: (updated: Reminder) => void
  onDelete: (id: string) => void
}

// ── Reminder Modal ─────────────────────────────────────────────────────────────

export function ReminderModal({ onSave, onClose, onTest, displayInfo, reminders, onEdit, onDelete }: ReminderModalProps) {
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
        top: Math.round((window.innerHeight - MODAL_H) / 2),
        width: MODAL_W,
      }
    }
    const { totalBounds, primaryBounds } = displayInfo
    const canvasOffsetX = primaryBounds.x - totalBounds.x
    const canvasOffsetY = primaryBounds.y - totalBounds.y
    return {
      left: Math.round(canvasOffsetX + (primaryBounds.width - MODAL_W) / 2),
      top: Math.round(canvasOffsetY + (primaryBounds.height - MODAL_H) / 2),
      width: MODAL_W,
    }
  })()

  // ── Derived: minutes until the selected time ─────────────────────────────────
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

  // Drop any selected offsets that are no longer valid when time changes
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
    if (!timeInput) { setError('Set a time.'); return }
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
                {reminderTypeKeys().map(t => {
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

            {/* Name */}
            <div className="modal-field">
              <label className="modal-label">Name</label>
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
                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
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

            {/* Action buttons */}
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
