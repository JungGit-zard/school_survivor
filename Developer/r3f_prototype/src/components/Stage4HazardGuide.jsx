import { useEffect, useState } from 'react'
import { getRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { getPressureCauldronHazardVisual } from '../lib/stage4PressureCauldronHazard.js'
import { useT } from '../lib/i18n.js'
import { uiType } from '../lib/uiStyle.js'

function guideKind(elapsedMs, stageId, phase, bossDefeated, escapePortalActive) {
  if (stageId !== 'stage4' || phase !== 'playing' || !Number.isFinite(elapsedMs) || elapsedMs < 0) return null
  const { boiling, bursting } = getPressureCauldronHazardVisual(elapsedMs, stageId, phase)
  if (bursting) return 'burst'
  if (boiling) return 'warning'
  if (elapsedMs < 3000) return 'orientation'
  if (elapsedMs < 6000) return 'orientationSouth'
  if (elapsedMs < 9000) return 'markers'
  if (elapsedMs < 12000) return 'soupMarkers'
  if (bossDefeated) return escapePortalActive ? 'escape' : 'bossDefeated'
  return null
}

// Supplemental copy only. The world/hazard visuals, input and simulation are
// independent of this component. HUD passes its existing higher-priority state.
export default function Stage4HazardGuide({ stageId, phase, gameKey, hidden = false, bossDefeated = false, escapePortalActive = false }) {
  const t = useT()
  const [, setKind] = useState(null)
  useEffect(() => {
    if (hidden || stageId !== 'stage4' || phase !== 'playing') return undefined
    const refresh = () => setKind(guideKind(getRuntimeElapsedMs(), stageId, phase, bossDefeated, escapePortalActive))
    refresh()
    // HUD snapshots are throttled; read the real game clock so a 250ms burst
    // cannot become a stale full-second warning. No wall-clock lifetime timer.
    const timer = window.setInterval(refresh, 50)
    return () => window.clearInterval(timer)
  }, [bossDefeated, escapePortalActive, gameKey, hidden, phase, stageId])

  const kind = guideKind(getRuntimeElapsedMs(), stageId, phase, bossDefeated, escapePortalActive)
  if (hidden || !kind) return null
  return (
    <div
      data-testid="stage4-hazard-guide"
      data-kind={kind}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={guideStyle}
    >
      {t(`stage4Guide.${kind}`)}
    </div>
  )
}

// Reserved gap below the top controls (44px), above MissionTracker (safe+102),
// and to the right of liveScore's min(34vw, 116px) column.
// No button, focus target, full-screen layer or lower thumb-zone content.
const guideStyle = {
  position: 'absolute',
  top: 'calc(max(14px, env(safe-area-inset-top, 0px)) + 52px)',
  left: 'calc(max(14px, env(safe-area-inset-left, 0px)) + min(34vw, 116px) + 8px)',
  right: 'var(--stage4-guide-right)',
  '--stage4-guide-right': 'max(14px, env(safe-area-inset-right, 0px))',
  maxWidth: 480,
  maxHeight: 44,
  boxSizing: 'border-box',
  overflow: 'hidden',
  padding: '4px 8px',
  border: '1px solid #ddc898',
  borderRadius: 6,
  background: 'rgba(25, 28, 32, 0.94)',
  color: '#fff3d6',
  fontFamily: uiType.family,
  fontSize: 12,
  lineHeight: '16px',
  textAlign: 'center',
  pointerEvents: 'none',
}
