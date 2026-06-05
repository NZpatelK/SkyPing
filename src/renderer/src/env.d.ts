interface Window {
  electronAPI: {
    onDisplayInfo: (callback: (info: unknown) => void) => () => void
    getDisplayInfo: () => Promise<unknown>
    onOpenReminderModal: (callback: () => void) => () => void
    notifyModalClosed: () => void
  }
}