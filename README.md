
# ✈️ SkyPing

> **Reminders that fly across your screen — literally.**

SkyPing is a macOS desktop app that delivers your meeting and task reminders as animated planes pulling banners across your screen. No notification tray. No pop-ups. Just a plane flying by at exactly the right moment, impossible to miss and impossible to hate.

---

## 🎬 Video Demo

> 📹 **[Watch the demo here](https://www.linkedin.com/posts/karan-h-patel_productivity-buildinpublic-opensource-ugcPost-7469508963798257664-Lv9U/?utm_source=share&utm_medium=member_desktop&rcm=ACoAADBGF6QB0QMDySUwhCV0IdNp7xgY9h60CLQ)** 

---

## ✨ Features

- 🛩️ **Animated flight notifications** — a plane pulls a banner across your screen above every other window
- 📅 **Multiple reminder types** — Meeting, Deadline, Focus, Break, Personal, Review, Other — each with its own colour and emoji
- ⚙️ **Notification settings** — choose flight speed (Slow / Normal / Fast / Sonic), vertical position (Top / Center / Bottom), and banner size (S / M / L / XL) to suit your comfort
- 🔲 **Banner size control** — scale the banner from a subtle small to an XL that is physically impossible to miss
- 🧪 **Live test button** — fire a test flight instantly with your current settings before saving
- ⏰ **Smart offset scheduling** — get reminded 1 min, 5 min, 30 min, or up to 2 hours before — options auto-adjust based on how far away your event is
- 🖥️ **Multi-monitor aware** — the overlay spans every display and always centres the modal on your primary screen
- 👻 **Fully click-through** — the overlay is invisible and never interrupts your mouse or keyboard when idle
- ⌨️ **Keyboard shortcut** — open the reminder modal instantly with `Cmd+Shift+R`

---

## 🖥️ How It Looks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   [your normal desktop / apps here]

     ✈️ ════════════════════════╗
                                ║  📅  TEAM STANDUP · 30 MIN BEFORE  ║
                                ╚════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


A plane enters from the left, pulls a coloured banner, and exits right. Fully above every other app, even fullscreen ones.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run in dev mode (hot-reload)
npm run dev
```

That's it. `electron-vite` compiles everything and launches Electron in one command.

---

## 📦 Build & Package

```bash
# Compile to out/
npm run build

# Run the compiled build
npm start

# Package a distributable installer
npm run pack     # → outputs to release/
```

Supported targets: **macOS** `.dmg` · **Windows** `.exe` (NSIS) · **Linux** `.AppImage`

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+Shift+R` | Open the reminder modal |
| `Cmd+Shift+H` | Toggle hide / show the overlay |
| `Cmd+Shift+Q` | Quit SkyPing |

---

## 🧠 How It Works

### The Overlay Window

SkyPing creates a single `BrowserWindow` that:

- Covers **all monitors** — the window bounds are calculated as the union of every connected display
- Is **fully transparent** (`transparent: true`, `backgroundColor: #00000000`)
- Has **no frame or title bar** (`frame: false`)
- Sits **above every other window** including fullscreen apps (`alwaysOnTop: true` at `screen-saver` level)
- Is **100% click-through** when idle (`setIgnoreMouseEvents(true, { forward: true })`) — your mouse passes straight through to whatever is below
- Is **visible on all workspaces and spaces** (`setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`)

When you open the reminder modal, click-through is temporarily disabled so you can interact with it. When you close the modal, click-through re-enables automatically.

### The Reminder Modal

Opened via `Cmd+Shift+R`. A dark glassmorphism modal appears centred on your primary display. It has two columns:

**Left column — New Reminder form:**
1. Pick a reminder type (Meeting, Deadline, Focus, etc.)
2. Enter a name
3. Set the time (HH:MM selectors)
4. Choose when to be reminded (offset chips auto-populate based on how far away the time is)
5. Configure notification settings — flight speed, vertical position, and banner size
6. Hit **Test flight** to preview, then **Save reminder**

**Right column — Active Reminders panel:**
Lists all your saved reminders with their type, time, and scheduled offsets. Each one has an edit ✏️ and delete 🗑️ action.

### Flight Animation

Each notification fires as a `Flight` object with these properties:

| Property | What it controls |
|---|---|
| `speedPx` | Pixels per second the plane travels (set by your speed preference) |
| `yPct` | Vertical position as a % of screen height (set by your position preference) |
| `sizeMult` | Scale multiplier applied to the entire plane + banner rig (set by your size preference) |
| `driftAmp` | How many pixels the plane bobs up and down |
| `driftPeriod` | How many seconds one full bob cycle takes |
| `colorHue` | HSL hue of the banner colour (varies by reminder type) |

[Framer Motion](https://www.framer.com/motion/) animates the plane from `x: -totalWidth` to `x: screenWidth + margin`, while a separate looping `y` animation creates the natural floating drift. The banner has a CSS `rotateY` + `rotateZ` flap animation to simulate wind. The entire rig is scaled uniformly using CSS `transform: scale(sizeMult)` so the plane and banner always stay proportional to each other.

### Notification Scheduling

When you save a reminder, `useReminders` calculates a `setTimeout` for each selected offset:

```
fireAt = meetingTime - offsetMinutes * 60 * 1000
delay  = fireAt - Date.now()
```

When the timer fires, it calls `flightFromReminder()` which builds a `Flight` object and launches it on screen. All timers are stored in a ref map and cleared on edit, delete, or unmount.

### IPC Bridge (Main ↔ Renderer)

Communication between the Electron main process and the React renderer goes through a secure **context bridge** in `preload/index.ts`. The exposed API is `window.electronAPI`:

| Channel | Direction | Purpose |
|---|---|---|
| `open-reminder-modal` | Main → Renderer | Triggered by `Cmd+Shift+R` global shortcut |
| `display-info` | Main → Renderer | Sends monitor bounds on load and display changes |
| `get-display-info` | Renderer → Main | Renderer requests display info on mount |
| `modal-closed` | Renderer → Main | Tells main to re-enable click-through |

### Notification Settings

Three settings live in the modal and apply to both test flights and real reminders:

**Flight Speed:**
| Option | Speed Range |
|---|---|
| 🛩️ Slow | 60–90 px/s |
| ✈️ Normal | 110–160 px/s |
| 🚀 Fast | 200–280 px/s |
| ⚡ Sonic | 380–480 px/s |

**Vertical Position:**
| Option | Screen Area |
|---|---|
| ⬆️ Top | 5–18% from top |
| ↔️ Center | 40–60% |
| ⬇️ Bottom | 75–88% from top |

**Banner Size:**
| Option | Scale | Best for |
|---|---|---|
| S | 0.65× | Subtle — stays out of the way |
| M | 1.0× | Default — balanced and clear |
| L | 1.4× | Hard to miss |
| XL | 1.9× | Impossible to miss — great for critical deadlines |

Within each range, speed and position values are randomised slightly per flight so repeated reminders don't stack on the exact same path.

---

## 🗂️ Project Structure

```
electron-overlay/
├── src/
│   ├── main/
│   │   └── index.ts              ← Electron main process
│   │                               (window creation, IPC handlers,
│   │                                global shortcuts, display tracking)
│   │
│   ├── preload/
│   │   └── index.ts              ← Context bridge
│   │                               (securely exposes electronAPI to renderer)
│   │
│   └── renderer/
│       ├── index.html            ← HTML shell
│       └── src/
│           ├── main.tsx          ← React entry point
│           ├── App.tsx           ← Root component, flight + modal state
│           ├── App.css           ← All styles (glassmorphism, animations)
│           ├── env.d.ts          ← TypeScript types for window.electronAPI
│           │
│           ├── types/
│           │   └── index.ts      ← Shared types (Reminder, Flight,
│           │                        NotificationSettings, BannerSize, etc.)
│           │
│           ├── constants/
│           │   └── index.ts      ← REMINDER_TYPES, colours, dimensions
│           │
│           ├── utils/
│           │   └── index.ts      ← flightFromReminder(), getOffsetOptions(),
│           │                        speedPxFromSetting(), yPctFromPosition(),
│           │                        sizeMultFromBannerSize()
│           │
│           ├── hooks/
│           │   ├── useReminders.ts   ← Reminder CRUD + timer scheduling
│           │   └── useDisplayInfo.ts ← Monitor bounds + stage dimensions
│           │
│           └── components/
│               ├── flight/
│               │   └── SingleFlight.tsx   ← Animated plane + banner (size-aware)
│               ├── modal/
│               │   └── ReminderModal.tsx  ← New reminder form +
│               │                            notification settings
│               └── reminders/
│                   ├── ActiveRemindersPanel.tsx  ← Right column list
│                   └── EditReminderRow.tsx        ← Inline edit UI
│
├── resources/
│   └── Info.plist                ← macOS privacy usage descriptions
│
├── electron.vite.config.ts       ← Build config
├── electron-builder.yml          ← Packaging config
└── package.json
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| 🖥️ **Desktop shell** | [Electron](https://www.electronjs.org/) v29 | Cross-platform desktop app with native OS APIs |
| ⚛️ **UI framework** | [React](https://react.dev/) v18 | Component-based UI with hooks for state management |
| 🔷 **Language** | [TypeScript](https://www.typescriptlang.org/) v5 | Type safety across main process, preload, and renderer |
| 🎬 **Animation** | [Framer Motion](https://www.framer.com/motion/) v11 | Physics-quality animations for flight entrance/exit and modal transitions |
| ⚡ **Build tool** | [electron-vite](https://electron-vite.org/) v2 | Vite-powered dev server with hot-reload for all three Electron processes |
| 📦 **Packager** | [electron-builder](https://www.electron.build/) v24 | Produces `.dmg`, `.exe`, `.AppImage` distributables |
| 🎨 **Styling** | Plain CSS with CSS animations | Glassmorphism cards, banner flap physics, takeoff keyframes |

---

## 🔒 Permissions

SkyPing does not access the internet, your calendar, microphone, camera, or any external service. All reminder data lives in memory for the session only — nothing is written to disk.

---

## 📋 Requirements

- **macOS** 12+ (primary target), Windows 10+, or Linux
- **Node.js** 18+
- **npm** 8+

---

## 🤝 Contributing

Pull requests welcome. For big changes, open an issue first to discuss what you'd like to change.

---

## 📄 License

MIT — do whatever you like with it.

---

*Built with ✈️ and too many late-night meetings.*
```
