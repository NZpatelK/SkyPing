import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import plane from './assets/plane.png'
import './App.css'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Flight {
  id: string
  msg: string
  emoji: string
  label: string
  colorHue: number   // HSL hue for the banner
  speedPx: number    // px/s across screen
  yPct: number       // vertical position 0–100%
  driftAmp: number
  driftPeriod: number
}

// ── Message library ────────────────────────────────────────────────────────────

const MESSAGES = [
  { emoji: '🚀', label: 'DEPLOY', msg: 'Production deployed', hue: 195 },
  { emoji: '⚡', label: 'ALERT', msg: 'CPU spike detected', hue: 45 },
  { emoji: '✅', label: 'BUILD', msg: 'Tests passed — 247/247', hue: 140 },
  { emoji: '🔥', label: 'HOT', msg: '1,337 users online', hue: 20 },
  { emoji: '💜', label: 'SYSTEM', msg: 'All systems nominal', hue: 270 },
  { emoji: '📡', label: 'SIGNAL', msg: 'Uplink established', hue: 210 },
  { emoji: '🎯', label: 'TARGET', msg: 'Objective completed', hue: 340 },
  { emoji: '🔮', label: 'AI', msg: 'Model inference ready', hue: 290 },
  { emoji: '📊', label: 'METRICS', msg: 'Revenue +23% this week', hue: 160 },
  { emoji: '🛡️', label: 'SECURE', msg: 'Threat neutralized', hue: 120 },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

let counter = 0
const uid = () => `flight-${++counter}`
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

function spawnFlight(): Flight {
  const base = pick(MESSAGES)
  return {
    id: uid(),
    msg: base.msg,
    emoji: base.emoji,
    label: base.label,
    colorHue: base.hue,
    speedPx: rand(110, 200),
    // vertically centered ± 15% so it feels prominent but not clipping edges
    yPct: rand(10, 35),
    driftAmp: rand(12, 28),
    driftPeriod: rand(3, 5),
  }
}

// ── Plane + Banner ─────────────────────────────────────────────────────────────

const PLANE_W = 180   // rendered plane width
const BANNER_W = 320  // banner width
const ROPE_W = 80     // rope length
const TOTAL_W = PLANE_W + ROPE_W + BANNER_W // ~580px

function SingleFlight({
  flight,
  stageW,
  stageH,
  onDone,
}: {
  flight: Flight
  stageW: number
  stageH: number
  onDone: (id: string) => void
}) {
  const startX = -TOTAL_W - 20
  const endX = stageW + 20
  const duration = (endX - startX) / flight.speedPx
  const yPx = (flight.yPct / 100) * stageH

  // Vertical sine drift keyframes
  const yFrames = [0, -flight.driftAmp, flight.driftAmp * 0.6, -flight.driftAmp * 0.4, flight.driftAmp, 0]

  return (
    <motion.div
      className="flight-wrapper"
      style={{ top: yPx }}
      initial={{ x: startX, opacity: 0 }}
      animate={{
        x: [startX, endX],
        y: yFrames,
        opacity: [0, 1, 1, 1, 1, 1, 0],
      }}
      transition={{
        x: { duration, ease: 'linear' },
        y: { duration: flight.driftPeriod, repeat: Infinity, ease: 'easeInOut' },
        opacity: { duration, ease: 'linear', times: [0, 0.05, 0.15, 0.5, 0.85, 0.95, 1] },
      }}
      onAnimationComplete={() => onDone(flight.id)}
    >
      {/* Rig order: banner (trailing) → rope → plane (leading right) */}
      <div className="flight-rig">
        {/* Banner — trails behind on the left */}
        <div
          className="banner"
          style={{
            background: `linear-gradient(135deg,
              hsl(${flight.colorHue}, 90%, 55%) 0%,
              hsl(${flight.colorHue}, 80%, 38%) 100%)`
          }}
        >
          <span className="banner-emoji">{flight.emoji}</span>
          <div className="banner-text">
            <span className="banner-label">{flight.label}</span>
            <span className="banner-msg">{flight.msg}</span>
          </div>
        </div>

        {/* Rope */}
        <div className="rope" />

        {/* Plane — leads on the right, facing right */}
        <div className="plane-wrap">
          <img src={plane} alt="plane" className="plane-img" />
        </div>
      </div>
    </motion.div>
  )
}

// ── App ────────────────────────────────────────────────────────────────────────

// How long to wait between flights (ms): flight finishes → next spawns
const INTER_FLIGHT_DELAY = 1200

export default function App() {
  const [stage, setStage] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [flight, setFlight] = useState<Flight | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track stage size
  useEffect(() => {
    const update = () => setStage({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', update)

    if (window.electronAPI) {
      const cleanup = window.electronAPI.onDisplayInfo((info: any) => {
        setStage({ w: info.totalBounds.width, h: info.totalBounds.height })
      })
      return () => { cleanup(); window.removeEventListener('resize', update) }
    }
    return () => window.removeEventListener('resize', update)
  }, [])

  // Launch first flight after a short delay
  useEffect(() => {
    const t = setTimeout(() => setFlight(spawnFlight()), 800)
    return () => clearTimeout(t)
  }, [])

  // When a flight finishes, wait then launch the next
  const onDone = useCallback((id: string) => {
    setFlight(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setFlight(spawnFlight())
    }, INTER_FLIGHT_DELAY)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div className="overlay-stage">
      <AnimatePresence>
        {flight && (
          <SingleFlight
            key={flight.id}
            flight={flight}
            stageW={stage.w}
            stageH={stage.h}
            onDone={onDone}
          />
        )}
      </AnimatePresence>
    </div>
  )
}