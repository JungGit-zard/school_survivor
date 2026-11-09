import { useEffect, useRef, useState } from 'react'
import { getRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { getStage5CallLaneState } from '../lib/stage5CallLaneRuntime.js'
import { getBossSummonWarning } from '../lib/expansionBossSummons.js'
import { useT } from '../lib/i18n.js'
import { uiType } from '../lib/uiStyle.js'

// Stage 5 「전교 호출 방송」 보조 문구(스펙 Part B §10-5). Stage4HazardGuide와 같은 상단 띠 자리.
// 우선순위: chime > calling > bossSummon > bossIntro > orientation 3종 > bossDefeated/escape.
// 호출 상태의 정본은 Enemies.jsx가 발행하는 getStage5CallLaneState()이고, 이 컴포넌트는 읽기만 한다.
export const STAGE5_BOSS_SUMMON_GUIDE_MS = 2000
const STAGE5_BOSS_INTRO_START_MS = 150000
const STAGE5_BOSS_INTRO_END_MS = 154000

export function stage5GuideKind({ elapsedMs, stageId, phase, gameKey, bossDefeated, escapePortalActive, callState, summonActive }) {
  if (stageId !== 'stage5' || phase !== 'playing' || !Number.isFinite(elapsedMs) || elapsedMs < 0) return null
  const liveCall = callState && callState.gameKey === gameKey ? callState.phase : 'idle'
  if (liveCall === 'chiming') return 'chime'
  if (liveCall === 'calling') return 'calling'
  if (summonActive) return 'bossSummon'
  if (elapsedMs >= STAGE5_BOSS_INTRO_START_MS && elapsedMs < STAGE5_BOSS_INTRO_END_MS && !bossDefeated) return 'bossIntro'
  if (elapsedMs < 3000) return 'orientation'
  if (elapsedMs < 6000) return 'lanes'
  if (elapsedMs < 9000) return 'callRule'
  if (bossDefeated) return escapePortalActive ? 'escape' : 'bossDefeated'
  return null
}

// 보스 소환 경고(getBossSummonWarning)는 버전이 바뀐 시점부터 게임 시계로 2초 보인다.
// 마운트 시점의 버전은 "이미 본 것"으로 둬서 지난 판의 경고가 다시 뜨지 않게 한다.
function useSummonActive(gameKey, enabled) {
  const seenRef = useRef(null)
  if (seenRef.current === null) seenRef.current = { version: getBossSummonWarning().version, atMs: -Infinity }
  return () => {
    if (!enabled) return false
    const warning = getBossSummonWarning()
    const now = getRuntimeElapsedMs()
    if (warning.version !== seenRef.current.version) {
      seenRef.current = { version: warning.version, atMs: warning.gameKey === gameKey ? now : -Infinity }
    }
    return now - seenRef.current.atMs >= 0 && now - seenRef.current.atMs < STAGE5_BOSS_SUMMON_GUIDE_MS
  }
}

export default function Stage5CallGuide({ stageId, phase, gameKey, hidden = false, bossDefeated = false, escapePortalActive = false }) {
  const t = useT()
  const [, setTick] = useState(0)
  const active = !hidden && stageId === 'stage5' && phase === 'playing'
  const readSummon = useSummonActive(gameKey, stageId === 'stage5')
  useEffect(() => {
    if (!active) return undefined
    // HUD 스냅샷은 스로틀되므로 실제 게임 시계를 50ms마다 읽는다(Stage4HazardGuide와 같은 방식).
    const timer = window.setInterval(() => setTick((value) => (value + 1) % 1000000), 50)
    return () => window.clearInterval(timer)
  }, [active])

  const kind = stage5GuideKind({
    elapsedMs: getRuntimeElapsedMs(),
    stageId,
    phase,
    gameKey,
    bossDefeated,
    escapePortalActive,
    callState: getStage5CallLaneState(),
    summonActive: readSummon(),
  })
  if (hidden || !kind) return null
  return (
    <div
      data-testid="stage5-call-guide"
      data-kind={kind}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={guideStyle}
    >
      {t(`stage5Guide.${kind}`)}
    </div>
  )
}

// Stage4HazardGuide와 같은 자리·크기. 색만 파랑(호출 = 파란 통로 의미 통일). 버튼·포커스 대상 없음.
const guideStyle = {
  position: 'absolute',
  top: 'calc(max(14px, env(safe-area-inset-top, 0px)) + 52px)',
  left: 'calc(max(14px, env(safe-area-inset-left, 0px)) + min(34%, 116px) + 8px)',
  right: 'max(14px, env(safe-area-inset-right, 0px))',
  maxWidth: 480,
  maxHeight: 44,
  boxSizing: 'border-box',
  overflow: 'hidden',
  padding: '4px 8px',
  border: '1px solid #8FB3FF',
  borderRadius: 6,
  background: 'rgba(20, 26, 40, 0.94)',
  color: '#EAF1FF',
  fontFamily: uiType.family,
  fontSize: 12,
  lineHeight: '16px',
  textAlign: 'center',
  pointerEvents: 'none',
}
