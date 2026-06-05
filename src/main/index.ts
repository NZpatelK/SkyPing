import { app, BrowserWindow, screen, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'

let overlayWindow: BrowserWindow | null = null

// ─── Calculate union bounds of all monitors ───────────────────────────────────
function getFullscreenBounds() {
  const displays = screen.getAllDisplays()
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const d of displays) {
    const { x, y, width, height } = d.bounds
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function createOverlayWindow() {
  const bounds = getFullscreenBounds()

  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,          // must be true for modal input
    hasShadow: false,
    roundedCorners: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  })

  // Start click-through
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  overlayWindow.webContents.once('did-finish-load', () => sendDisplayInfo())

  if (process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  overlayWindow.on('closed', () => { overlayWindow = null })

  screen.on('display-added', repositionWindow)
  screen.on('display-removed', repositionWindow)
  screen.on('display-metrics-changed', repositionWindow)
}

function sendDisplayInfo() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  const bounds = getFullscreenBounds()
  const primary = screen.getPrimaryDisplay()
  overlayWindow.webContents.send('display-info', {
    totalBounds: bounds,
    primaryBounds: primary.bounds,   // ← added: exact primary screen rect
    displays: screen.getAllDisplays().map((d) => ({
      id: d.id,
      bounds: d.bounds,
      scaleFactor: d.scaleFactor,
    })),
  })
}

function repositionWindow() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  const bounds = getFullscreenBounds()
  overlayWindow.setBounds(bounds)
  sendDisplayInfo()
}

function setModalMode(open: boolean) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  if (open) {
    overlayWindow.setIgnoreMouseEvents(false)
    overlayWindow.focus()
  } else {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  }
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createOverlayWindow()

  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit())

  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return
    overlayWindow.isVisible() ? overlayWindow.hide() : overlayWindow.show()
  })

  // Cmd+Shift+R → open reminder modal
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return
    overlayWindow.show()
    setModalMode(true)
    overlayWindow.webContents.send('open-reminder-modal')
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!overlayWindow || overlayWindow.isDestroyed()) createOverlayWindow()
})

app.on('will-quit', () => globalShortcut.unregisterAll())

// ─── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.handle('get-display-info', () => {
  const bounds = getFullscreenBounds()
  const primary = screen.getPrimaryDisplay()
  return {
    totalBounds: bounds,
    primaryBounds: primary.bounds,
    displays: screen.getAllDisplays().map((d) => ({
      id: d.id, bounds: d.bounds, scaleFactor: d.scaleFactor,
    })),
  }
})

ipcMain.on('modal-closed', () => setModalMode(false))