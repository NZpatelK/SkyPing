import { useState } from 'react'
import type { Reminder } from '../../types'
import { REMINDER_TYPES } from '../../constants'
import { fmt12, formatOffset } from '../../utils'
import { EditReminderRow } from './EditReminderRow'

interface ActiveRemindersPanelProps {
  reminders: Reminder[]
  onEdit: (updated: Reminder) => void
  onDelete: (id: string) => void
}

// ── Active Reminders Panel (right column of the modal) ────────────────────────

export function ActiveRemindersPanel({ reminders, onEdit, onDelete }: ActiveRemindersPanelProps) {
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
              : `${Math.floor(minsLeft / 60)}h ${minsLeft % 60 > 0 ? `${minsLeft % 60}m` : ''}`

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
