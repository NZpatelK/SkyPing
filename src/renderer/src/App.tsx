import { useCallback, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import './App.css'

import type { Flight } from './types'
import { uid } from './utils'
import { useDisplayInfo } from './hooks/useDisplayInfo'
import { useReminders } from './hooks/useReminders'
import { SingleFlight } from './components/flight/SingleFlight'
import { ReminderModal } from './components/modal/ReminderModal'
import { useEffect } from 'react'

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [flights, setFlights] = useState<Flight[]>([])
  const [showModal, setShowModal] = useState(false)

  const { stage, displayInfo } = useDisplayInfo()

  const addFlight = useCallback((f: Flight) => {
    setFlights(prev => [...prev, f])
  }, [])

  const removeFlight = useCallback((id: string) => {
    setFlights(prev => prev.filter(f => f.id !== id))
  }, [])

  const { reminders, handleSaveReminder, handleEditReminder, handleDeleteReminder, handleTestRun } =
    useReminders(addFlight)

  // IPC: open modal on Cmd+Shift+R
  useEffect(() => {
    if (!window.electronAPI?.onOpenReminderModal) return
    const cleanup = window.electronAPI.onOpenReminderModal(() => setShowModal(true))
    return cleanup
  }, [])

  const closeModal = useCallback(() => {
    setShowModal(false)
    window.electronAPI?.notifyModalClosed?.()
  }, [])

  return (
    <>
      {/* Fullscreen transparent stage — flights animate across here */}
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

      {/* Reminder modal — opened via keyboard shortcut or IPC */}
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
