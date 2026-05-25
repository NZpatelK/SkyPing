import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import plane from './assets/plane.png'
import './App.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type Color = 'cyan' | 'pink' | 'green' | 'yellow' | 'purple' | 'orange'

interface Pill {
  id: string
  emoji: string
  label: string
  msg: string
  color: Color
  speedPx: number      // px per second across screen
  yPct: number         // 0–100 vertical position %
  driftAmp: number     // vertical float amplitude px
  driftPeriod: number  // seconds per float cycle
  scale: number        // size multiplier
  spawnDelay: number   // seconds before motion starts
}

// ── Notification library ──────────────────────────────────────────────────────

const LIBRARY: Omit<Pill, 'id' | 'speedPx' | 'yPct' | 'driftAmp' | 'driftPeriod' | 'scale' | 'spawnDelay'>[] = [
  { emoji: '🚀', label: 'DEPLOY', msg: 'Production deployed', color: 'cyan' },
  { emoji: '⚡', label: 'ALERT', msg: 'CPU spike detected', color: 'yellow' },
  { emoji: '💜', label: 'SYSTEM', msg: 'All systems nominal', color: 'purple' },
  { emoji: '🔥', label: 'HOT', msg: '1,337 users online', color: 'orange' },
  { emoji: '✅', label: 'BUILD', msg: 'Tests passed — 247/247', color: 'green' },
  { emoji: '💬', label: 'MESSAGE', msg: 'New message from @alex', color: 'cyan' },
  { emoji: '🛡️', label: 'SECURITY', msg: 'Threat neutralized', color: 'green' },
  { emoji: '📡', label: 'SIGNAL', msg: 'Uplink established', color: 'cyan' },
  { emoji: '🎯', label: 'TARGET', msg: 'Objective completed', color: 'pink' },
  { emoji: '🌐', label: 'NETWORK', msg: 'Global sync — 99.9% uptime', color: 'purple' },
  { emoji: '💾', label: 'BACKUP', msg: 'Snapshot saved to vault', color: 'yellow' },
  { emoji: '🔮', label: 'AI', msg: 'Model inference ready', color: 'pink' },
  { emoji: '🦾', label: 'AGENT', msg: 'Task force activated', color: 'orange' },
  { emoji: '📊', label: 'METRICS', msg: 'Revenue +23% this week', color: 'green' },
  { emoji: '🌊', label: 'STREAM', msg: 'Data pipeline flowing', color: 'cyan' },
  { emoji: '🧬', label: 'BIO', msg: 'Sequence analysis complete', color: 'pink' },
  { emoji: '🏆', label: 'SCORE', msg: 'New high score achieved', color: 'yellow' },
  { emoji: '🛸', label: 'UFO', msg: 'Unknown object detected', color: 'purple' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

let counter = 0
const uid = () => `pill-${++counter}-${Date.now()}`
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

function spawnPill(stageH: number, delay = 0): Pill {
  const base = pick(LIBRARY)
  return {
    ...base,
    id: uid(),
    speedPx: rand(90, 230),
    yPct: rand(12, 88),
    driftAmp: rand(10, 30),
    driftPeriod: rand(2.5, 5.5),
    scale: rand(0.88, 1.12),
    spawnDelay: delay,
  }
}

// ── FloatingPill ──────────────────────────────────────────────────────────────

const PILL_W = 290  // estimated pill width for off-screen start

function FloatingPill({
  pill,
  stageW,
  stageH,
  onDone,
}: {
  pill: Pill;
  stageW: number;
  stageH: number;
  onDone: (id: string) => void;
}) {
  const startX = -PILL_W - 10;
  const endX = stageW + 20;
  const duration = (endX - startX) / pill.speedPx;
  const yPx = (pill.yPct / 100) * stageH;

  return (
    <motion.div
      className="ad-plane-wrapper"
      style={{
        top: yPx,
        left: 0,
        scale: pill.scale,
      }}
      initial={{ x: startX, opacity: 0 }}
      animate={{
        x: [startX, endX],
        y: [
          0,
          -pill.driftAmp,
          pill.driftAmp * 0.5,
          -pill.driftAmp * 0.3,
          pill.driftAmp,
          0,
        ],
        opacity: [0, 1, 1, 1, 1, 0.95, 0],
      }}
      transition={{
        x: { duration, ease: "linear", delay: pill.spawnDelay },
        y: {
          duration: pill.driftPeriod,
          repeat: Infinity,
          ease: "easeInOut",
          delay: pill.spawnDelay,
        },
        opacity: {
          duration,
          ease: "linear",
          delay: pill.spawnDelay,
        },
      }}
      onAnimationComplete={() => onDone(pill.id)}
    >
      <div className="ad-plane">
        {/* plane (anchor) */}
        <img src={plane} alt="plane" className="plane" />

        {/* rope */}
        <div className="rope" />

        {/* banner */}
        <div className="banner">
          <span>{pill.msg}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

const MAX_PILLS = 8
const SPAWN_MS = 1700

export default function App() {
  const [stage, setStage] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [pills, setPills] = useState<Pill[]>([])

  // Track stage size — also listen for Electron display-info
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

  // Initial burst + continuous spawning
  useEffect(() => {
    // Seed 5 pills with staggered delays so screen isn't empty on launch
    setPills(Array.from({ length: 5 }, (_, i) => spawnPill(stage.h, i * 0.55)))

    const id = setInterval(() => {
      setPills(prev => {
        if (prev.length >= MAX_PILLS) return prev
        return [...prev, spawnPill(stage.h)]
      })
    }, SPAWN_MS)

    return () => clearInterval(id)
  }, [stage.h])

  const onDone = useCallback((id: string) => {
    setPills(prev => prev.filter(p => p.id !== id))
  }, [])

  return (
    <div className="overlay-stage">
      <AnimatePresence>
        {pills.map(pill => (
          <FloatingPill
            key={pill.id}
            pill={pill}
            stageW={stage.w}
            stageH={stage.h}
            onDone={onDone}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
