import { useCallback, useEffect, useRef, useState } from 'react'
import type { Flight, Reminder, ReminderType } from '../types'
import { uid, flightFromReminder } from '../utils'

// ── useReminders ───────────────────────────────────────────────────────────────
// Manages all reminder state: CRUD, notification timer scheduling, and test runs.
// Returns reminder list + handlers to pass down to the modal and panel.

interface UseRemindersReturn {
  reminders: Reminder[]
  handleSaveReminder: (data: Omit<Reminder, 'id' | 'createdAt'>) => void
  handleEditReminder: (updated: Reminder) => void
  handleDeleteReminder: (id: string) => void
  handleTestRun: (name: string, type: ReminderType, meetingTime: Date) => void
}

export function useReminders(addFlight: (f: Flight) => void): UseRemindersReturn {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const notifTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map())

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

  // Edit existing reminder → cancel old timers and reschedule
  const handleEditReminder = useCallback((updated: Reminder) => {
    cancelReminder(updated.id)
    setReminders(prev => prev.map(r => r.id === updated.id ? updated : r))
    scheduleReminder(updated)
  }, [cancelReminder, scheduleReminder])

  // Delete reminder → cancel timers and remove from list
  const handleDeleteReminder = useCallback((id: string) => {
    cancelReminder(id)
    setReminders(prev => prev.filter(r => r.id !== id))
  }, [cancelReminder])

  // Test: immediately fire a flight with "Test - {name}" label (offset=5 for display)
  const handleTestRun = useCallback((name: string, type: ReminderType, meetingTime: Date) => {
    const testReminder: Reminder = {
      id: uid(), name, type, meetingTime, offsetsMin: [5], createdAt: Date.now(),
    }
    addFlight(flightFromReminder(testReminder, 5))
  }, [addFlight])

  // Clear all timers on unmount
  useEffect(() => () => {
    notifTimersRef.current.forEach(timers => timers.forEach(clearTimeout))
  }, [])

  return { reminders, handleSaveReminder, handleEditReminder, handleDeleteReminder, handleTestRun }
}
