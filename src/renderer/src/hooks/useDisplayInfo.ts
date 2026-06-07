import { useEffect, useState } from 'react'
import type { DisplayInfo } from '../types'

interface StageSize {
  w: number
  h: number
}

interface UseDisplayInfoReturn {
  stage: StageSize
  displayInfo: DisplayInfo | null
}

// ── useDisplayInfo ─────────────────────────────────────────────────────────────
// Subscribes to display-info IPC events and exposes the total stage size
// (used to position flight animations) plus primaryBounds (used to centre the modal).

export function useDisplayInfo(): UseDisplayInfoReturn {
  const [stage, setStage] = useState<StageSize>({ w: window.innerWidth, h: window.innerHeight })
  const [displayInfo, setDisplayInfo] = useState<DisplayInfo | null>(null)

  useEffect(() => {
    const update = () => setStage({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', update)

    if (window.electronAPI) {
      // Push: main process broadcasts on display change
      const cleanup = window.electronAPI.onDisplayInfo((info: any) => {
        setStage({ w: info.totalBounds.width, h: info.totalBounds.height })
        if (info.primaryBounds) {
          setDisplayInfo({ totalBounds: info.totalBounds, primaryBounds: info.primaryBounds })
        }
      })

      // Pull: fetch current display info on mount
      window.electronAPI.getDisplayInfo?.().then((info: any) => {
        if (info?.primaryBounds) {
          setDisplayInfo({ totalBounds: info.totalBounds, primaryBounds: info.primaryBounds })
        }
      })

      return () => { cleanup(); window.removeEventListener('resize', update) }
    }

    return () => window.removeEventListener('resize', update)
  }, [])

  return { stage, displayInfo }
}
