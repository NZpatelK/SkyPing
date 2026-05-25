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

    // ── Overlay essentials ──────────────────────
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    roundedCorners: false,
    backgroundColor: '#00000000',

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // keep animating even when not focused
    },
  })

  // ── Click-through: all mouse events fall through to OS ──────────────────────
  overlayWindow.setIgnoreMouseEvents(true)

  // ── Above EVERYTHING — including fullscreen apps ────────────────────────────
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // ── Send display geometry to renderer once loaded ───────────────────────────
  overlayWindow.webContents.once('did-finish-load', () => {
    sendDisplayInfo()
  })

  // ── Load Vite dev server in dev, built file in production ───────────────────
  if (process.env['ELECTRON_RENDERER_URL']) {
    // electron-vite sets this automatically in dev mode
    overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    // Detached devtools won't break the transparent overlay:
    // overlayWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  overlayWindow.on('closed', () => { overlayWindow = null })

  // ── Re-cover all monitors on display changes ────────────────────────────────
  screen.on('display-added', repositionWindow)
  screen.on('display-removed', repositionWindow)
  screen.on('display-metrics-changed', repositionWindow)
}

function sendDisplayInfo() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  const bounds = getFullscreenBounds()
  overlayWindow.webContents.send('display-info', {
    totalBounds: bounds,
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

// ─── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createOverlayWindow()

  // Ctrl+Shift+Q  →  quit (needed since the window is click-through / no taskbar)
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit())

  // Ctrl+Shift+H  →  toggle overlay visibility
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return
    overlayWindow.isVisible() ? overlayWindow.hide() : overlayWindow.show()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!overlayWindow || overlayWindow.isDestroyed()) createOverlayWindow()
})

app.on('will-quit', () => globalShortcut.unregisterAll())

// ─── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.handle('get-display-info', () => {
  const bounds = getFullscreenBounds()
  return {
    totalBounds: bounds,
    displays: screen.getAllDisplays().map((d) => ({
      id: d.id, bounds: d.bounds, scaleFactor: d.scaleFactor,
    })),
  }
})
