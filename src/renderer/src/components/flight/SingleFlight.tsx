import { motion } from 'framer-motion'
import plane from '../../assets/plane.png'
import type { Flight } from '../../types'
import { PLANE_W, BANNER_W, ROPE_W } from '../../constants'

const TOTAL_W = PLANE_W + ROPE_W + BANNER_W

interface SingleFlightProps {
  flight: Flight
  stageW: number
  stageH: number
  onDone: (id: string) => void
}

// ── Single animated plane + banner ────────────────────────────────────────────

export function SingleFlight({ flight, stageW, stageH, onDone }: SingleFlightProps) {
  const s = flight.sizeMult ?? 1.0
  const scaledTotal = TOTAL_W * s
  const startX = -scaledTotal - 20
  const endX = stageW + 20
  const duration = (endX - startX) / flight.speedPx
  const yPx = (flight.yPct / 100) * stageH
  const yFrames = [0, -flight.driftAmp, flight.driftAmp * 0.6, -flight.driftAmp * 0.4, flight.driftAmp, 0]

  return (
    <motion.div
      className="flight-wrapper"
      style={{ top: yPx }}
      initial={{ x: startX, opacity: 0 }}
      animate={{ x: [startX, endX], y: yFrames, opacity: [0, 1, 1, 1, 1, 1, 0] }}
      transition={{
        x: { duration, ease: 'linear' },
        y: { duration: flight.driftPeriod, repeat: Infinity, ease: 'easeInOut' },
        opacity: { duration, ease: 'linear', times: [0, 0.05, 0.15, 0.5, 0.85, 0.95, 1] },
      }}
      onAnimationComplete={() => onDone(flight.id)}
    >
      {/* scale the entire rig uniformly by sizeMult */}
      <div className="flight-rig" style={{ transform: `scale(${s})`, transformOrigin: 'left center' }}>
        <div className="banner" style={{
          background: `linear-gradient(135deg,
            hsl(${flight.colorHue}, 90%, 55%) 0%,
            hsl(${flight.colorHue}, 80%, 38%) 100%)`
        }}>
          <span className="banner-emoji">{flight.emoji}</span>
          <div className="banner-text">
            <span className="banner-label">{flight.label}</span>
            <span className="banner-msg">{flight.msg}</span>
          </div>
        </div>
        <div className="rope" />
        <div className="plane-wrap">
          <img src={plane} alt="plane" className="plane-img" />
        </div>
      </div>
    </motion.div>
  )
}