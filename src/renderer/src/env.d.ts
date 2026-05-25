/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    onDisplayInfo: (cb: (info: unknown) => void) => () => void
    getDisplayInfo: () => Promise<unknown>
  }
}
