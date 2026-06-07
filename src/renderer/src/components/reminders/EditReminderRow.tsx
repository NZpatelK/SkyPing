import { useState } from 'react'
import type { Reminder, ReminderType } from '../../types'
import { REMINDER_TYPES } from '../../constants'
import { getOffsetOptions, formatOffset, reminderTypeKeys } from '../../utils'

interface EditReminderRowProps {
  reminder: Reminder
  onSave: (updated: Reminder) => void
  onCancel: () => void
}

// ── Inline edit form for an existing reminder (shown in the active panel) ──────

export function EditReminderRow({ reminder, onSave, onCancel }: EditReminderRowProps) {
  const [name, setName] = useState(reminder.name)
  const [type, setType] = useState<ReminderType>(reminder.type)
  const [timeInput, setTimeInput] = useState(() => {
    const d = new Date(reminder.meetingTime)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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
    onSave({ ...reminder, name: name.trim(), type, meetingTime: d, offsetsMin: [...selectedOffsets].sort((a, b) => a - b) })
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

      {/* Type selector */}
      <div className="edit-type-row">
        {reminderTypeKeys().map(t => {
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

      {/* Time selects */}
      <div className="edit-time-row">
        <select
          className="edit-select"
          value={timeInput.split(':')[0]}
          onChange={e => setTimeInput(`${e.target.value}:${timeInput.split(':')[1] ?? '00'}`)}
        >
          {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>:</span>
        <select
          className="edit-select"
          value={timeInput.split(':')[1] ?? '00'}
          onChange={e => setTimeInput(`${timeInput.split(':')[0]}:${e.target.value}`)}
        >
          {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Offset chips */}
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

      {/* Actions */}
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
