import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  onDisplayInfo: (callback: (info: unknown) => void) => {
    ipcRenderer.on('display-info', (_e, info) => callback(info))
    return () => ipcRenderer.removeAllListeners('display-info')
  },
  getDisplayInfo: () => ipcRenderer.invoke('get-display-info'),
})
