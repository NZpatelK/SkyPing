# Electron Floating Overlay

Transparent, click-through fullscreen desktop overlay — neon glassmorphism notification pills float across all your monitors above every window.

---

## Quick Start (local desktop)

```bash
# 1 — install
npm install

# 2 — run (dev mode: hot-reload React + Electron)
npm run dev
```

That's it. `electron-vite` compiles the main process, starts Vite, waits for it, then launches Electron — all in one command.

---

## Production build

```bash
npm run build   # compiles everything to out/
npm start       # runs from out/
```

To package a distributable:
```bash
npm run pack    # creates installer in release/
```

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+Q` / `Cmd+Shift+Q` | **Quit** |
| `Ctrl+Shift+H` / `Cmd+Shift+H` | **Toggle** hide / show |

The overlay is 100% click-through so you interact with your normal apps underneath. Use shortcuts or kill the process to stop it.

---

## Project layout (electron-vite convention)

```
src/
  main/
    index.ts        ← Electron main process
  preload/
    index.ts        ← Context bridge
  renderer/
    index.html      ← HTML shell
    src/
      main.tsx      ← React entry
      App.tsx       ← Animated overlay UI
      App.css       ← Glassmorphism + neon styles
      env.d.ts      ← window.electronAPI types
electron.vite.config.ts
package.json
```

---

## How the overlay works

| Setting | Value | Why |
|---|---|---|
| `transparent` | `true` | invisible background |
| `frame` | `false` | no title bar |
| `alwaysOnTop` | `true` + `'screen-saver'` level | above fullscreen apps |
| `focusable` | `false` | never steals focus |
| `skipTaskbar` | `true` | invisible in taskbar |
| `setIgnoreMouseEvents(true)` | — | 100% click-through |
| `setVisibleOnAllWorkspaces` | `{ visibleOnFullScreen: true }` | all spaces/desktops |

**Multi-monitor:** `screen.getAllDisplays()` union bounds sizes the window to span every monitor. Reconnects automatically on display changes.

**Animation:** Framer Motion drives each pill — randomised speed (90–230 px/s), Y position (12–88 % of screen height), vertical float amplitude and period, scale. Up to 8 pills concurrent, new one spawns every ~1.7 s.

---

## Customise

Edit `LIBRARY` in `src/renderer/src/App.tsx` to change notification text/emoji.  
Edit `MAX_PILLS` and `SPAWN_MS` at the bottom of the same file to control density.  
Colors available: `cyan` `pink` `green` `yellow` `purple` `orange`.
