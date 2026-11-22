import { useEffect, useRef, useState } from 'react'
import { getRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { useT } from '../lib/i18n.js'
import { uiType } from '../lib/uiStyle.js'
import { advanceWaveDebut, createWaveDebutQueue, isWaveDebutIdle, noteWaveDebut, setWaveDebutListener, waveDebutRoleInfo } from '../lib/waveDebutNotice.js'
import { getZombieTypeLabel } from '../lib/zombieEncyclopedia.js'
import { useGameStore } from '../store/useGameStore.js'

const TICK_MS = 100
// 같은 오른쪽 위 자리를 쓰는 스테이지 안내(Stage4HazardGuide·Stage5CallGuide)가 떠 있으면 비켜서 기다린다.
const GUIDE_BAND_SELECTOR = '[data-testid="stage4-hazard-guide"], [data-testid="stage5-call-guide"]'

function guideBandTaken() {
  return typeof document !== 'undefined' && document.querySelector(GUIDE_BAND_SELECTOR) != null
}

// 웨이브 특수 첫 등장 자막(lib/waveDebutNotice.js). 프레임 경로에는 아무것도 붙이지 않는다:
// 스폰 다리에서 첫 등장일 때만 깨어나 100ms 간격으로 줄을 넘기고, 리렌더는 자막이 바뀔 때뿐이다. 줄이 비면 타이머를 끈다.
export default function WaveDebutToast({ gameKey, hidden = false }) {
  const t = useT()
  const queueRef = useRef(null)
  const hiddenRef = useRef(hidden)
  hiddenRef.current = hidden
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  // 판(gameKey)마다 새 장부. 이 판에서 본 종만 기억한다.
  useEffect(() => {
    const q = createWaveDebutQueue()
    queueRef.current = q
    setNotice(null)
    setBusy(false)
    return setWaveDebutListener((type, waveRole) => {
      const state = useGameStore.getState()
      if (noteWaveDebut(q, { type, waveRole, stageId: state.currentStageId, atMs: getRuntimeElapsedMs(state.elapsedMs) })) setBusy(true)
    })
  }, [gameKey])

  useEffect(() => {
    if (!busy) return undefined
    const q = queueRef.current
    let last = Date.now()
    const tick = () => {
      const now = Date.now()
      const dt = now - last
      last = now
      const current = advanceWaveDebut(q, dt, { blocked: hiddenRef.current || guideBandTaken(), nowMs: getRuntimeElapsedMs(useGameStore.getState().elapsedMs) })
      setNotice((prev) => (prev === current ? prev : current))
      if (isWaveDebutIdle(q)) setBusy(false)
    }
    tick()
    const timer = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(timer)
  }, [busy, gameKey])

  if (!notice || hidden) return null
  const info = waveDebutRoleInfo(notice.code)
  if (!info) return null
  return (
    <div
      key={`${gameKey}:${notice.type}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="wave-debut-toast"
      data-type={notice.type}
      data-role={info.key}
      className="wave-debut-in"
      style={styles.root}
    >
      <style>{TOAST_CSS}</style>
      <span aria-hidden="true" data-testid="wave-debut-dot" style={{ ...styles.dot, background: info.color }} />
      <span style={styles.text}>
        <strong style={styles.name}>{getZombieTypeLabel(notice.type)}</strong>
        <span style={styles.role}>{t(`waveDebut.role.${info.key}`, null, info.line)}</span>
      </span>
    </div>
  )
}

const TOAST_CSS = `
@keyframes waveDebutIn { from { transform: translateX(10px); opacity: 0 } to { transform: none; opacity: 1 } }
.wave-debut-in { animation: waveDebutIn 180ms ease-out both }
@media (prefers-reduced-motion: reduce) { .wave-debut-in { animation: none } }
`

// 자리(2026-11-22 uimini): 오른쪽 위, 금화 칩(안전 위 + 0~44px) 아래 안내 띠(+54px). 왼쪽 점수 열(min(34%, 116px)) 오른쪽만 쓴다.
// 높이 44px 이하라 아래 미션 완료 토스트(왼쪽, 안전 위 + 102px)와 겹치지 않는다. 아래쪽 엄지(조이스틱)·HP·무기 칸과는 멀다.
// % 는 HUD 루트(= 게임 프레임) 폭. 버튼·포커스 대상 없음, pointer-events 없음.
const SAFE_TOP = 'max(14px, env(safe-area-inset-top, 0px))'
const SAFE_LEFT = 'max(14px, env(safe-area-inset-left, 0px))'
const SAFE_RIGHT = 'max(14px, env(safe-area-inset-right, 0px))'

const styles = {
  root: {
    position: 'absolute',
    top: `calc(${SAFE_TOP} + 54px)`,
    right: SAFE_RIGHT,
    zIndex: 6,
    maxWidth: `calc(100% - ${SAFE_LEFT} - min(34%, 116px) - 8px - ${SAFE_RIGHT})`,
    maxHeight: 44,
    boxSizing: 'border-box',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '3px 11px 3px 9px',
    border: '1px solid rgba(255, 243, 214, 0.45)',
    borderRadius: 8,
    background: 'rgba(18, 20, 28, 0.9)',
    color: '#ffffff',
    fontFamily: uiType.family,
    pointerEvents: 'none',
    userSelect: 'none',
  },
  dot: {
    flex: '0 0 auto',
    width: 14,
    height: 14,
    boxSizing: 'border-box',
    borderRadius: '50%',
    border: '2px solid #ffffff',
  },
  text: { display: 'grid', minWidth: 0 },
  name: {
    fontSize: 15,
    lineHeight: '18px',
    fontWeight: uiType.weightHeavy,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  role: {
    fontSize: 13,
    lineHeight: '16px',
    fontWeight: 800,
    color: '#ffe9b8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}
