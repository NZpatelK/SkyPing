import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  onDisplayInfo: (callback: (info: unknown) => void) => {
    ipcRenderer.on('display-info', (_e, info) => callback(info))
    return () => ipcRenderer.removeAllListeners('display-info')
  },
  getDisplayInfo: () => ipcRenderer.invoke('get-display-info'),

  // Modal lifecycle
  onOpenReminderModal: (callback: () => void) => {
    ipcRenderer.on('open-reminder-modal', () => callback())
    return () => ipcRenderer.removeAllListeners('open-reminder-modal')
  },
  notifyModalClosed: () => ipcRenderer.send('modal-closed'),
})