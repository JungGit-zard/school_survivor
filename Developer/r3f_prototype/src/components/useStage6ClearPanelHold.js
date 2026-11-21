import { useEffect, useState } from 'react'
import { STAGE6_FINISH_TAPE_SNAP_SECONDS, STAGE6_FINISH_TAPE_STAGE_ID } from './expansion/stage6FinishTape.js'

// Stage 6 탈출구 클리어 직후 결과창(+1부 엔딩 컷)을 잠깐 미뤄 3D 결승 테이프가 끊기는 모습(0.6초)을 보여 준다.
// - 판정: Stage 6 + phase 'cleared' + escapePortalActive(탈출구로 나간 클리어 = 테이프가 끊기는 조건과 같다).
//   다른 스테이지·게임오버·포탈 없이 난 클리어(검증 도구 등)는 지금처럼 즉시 띄운다.
// - 동작 줄이기(설정 data-reduced-effects 또는 OS prefers-reduced-motion)면 테이프가 바로 사라지므로 미루지 않는다.
// - store 쪽(phase 'cleared', 저장·랭킹 제출)은 그대로 — 여기서는 결과창이 보이는 순간만 바꾼다.
// - 시계: 실시간(Date.now). 클리어 순간 게임 시계는 멈춘다. 판(stageId:gameKey)마다 시작 시각을 모듈에 남겨
//   HUD가 다시 마운트돼도 처음부터 다시 기다리지 않는다.
export const STAGE6_CLEAR_PANEL_HOLD_MS = Math.round(STAGE6_FINISH_TAPE_SNAP_SECONDS * 1000) + 100

const ledger = { runKey: null, startMs: 0 }
export function resetStage6ClearPanelHoldLedger() {
  ledger.runKey = null
  ledger.startMs = 0
}

// Stage6FinishTape.jsx의 판정과 같다(설정의 효과 줄이기 또는 OS 동작 줄이기).
function isReducedMotion() {
  try {
    if (typeof document !== 'undefined' && document.documentElement?.hasAttribute?.('data-reduced-effects')) return true
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  } catch {
    return false
  }
}

/** 결과창을 아직 미루는 중이면 true. */
export function useStage6ClearPanelHold({ stageId, phase, escapePortalActive, gameKey }) {
  const [tick, setTick] = useState(0)
  const eligible = stageId === STAGE6_FINISH_TAPE_STAGE_ID && phase === 'cleared' && escapePortalActive === true
  const runKey = eligible ? `${stageId}:${gameKey}` : null
  let remainingMs = 0
  if (runKey) {
    // 판마다 한 번, 클리어 순간에 정한다(동작 줄이기면 기다림 없음).
    if (ledger.runKey !== runKey) {
      ledger.runKey = runKey
      ledger.startMs = isReducedMotion() ? -Infinity : Date.now()
    }
    remainingMs = Math.max(0, STAGE6_CLEAR_PANEL_HOLD_MS - (Date.now() - ledger.startMs))
  }
  const holding = remainingMs > 0

  useEffect(() => {
    if (!holding) return undefined
    const timer = window.setTimeout(() => setTick((value) => value + 1), remainingMs)
    return () => window.clearTimeout(timer)
    // remainingMs는 매 렌더 줄어든다 — 판·보류 여부·타이머 발화(tick)로만 다시 건다.
  }, [holding, runKey, tick])

  return holding
}
