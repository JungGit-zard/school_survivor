import { useEffect, useRef, useState } from 'react'
import { getRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { getAssemblySpeechCueState } from '../lib/stage6AssemblySpeech.js'
import { getBossSummonWarning } from '../lib/expansionBossSummons.js'
import { useT } from '../lib/i18n.js'
import { uiShadows, uiType } from '../lib/uiStyle.js'

// Stage 6 「운동장 최후의 조회」 HUD 보조 문구(스펙 Part C C-10-2).
// - 훈화 튜토리얼(첫 회차, 4.1초) / 훈화 짧은 경고(2회차부터 preCue와 함께 1.0초): stage6AssemblySpeech가 발행한 신호.
// - 운동장 10바퀴 소환 경고(1.2초): expansionBossSummons가 발행한 신호.
// - 정문 힌트(192~210초, 탈출구가 열리기 전까지): 화면 아래 중앙 화살표 + 문구, 조이스틱 영역 위.
// 신호는 게임 시계(getRuntimeElapsedMs) 기준으로 보이므로 일시정지 동안 사라지지 않고 멈춘다.
export const STAGE6_SPEECH_TUTORIAL_MS = 4100
export const STAGE6_SPEECH_SHORT_MS = 1000
export const STAGE6_TRACK_SUMMON_MS = 1200
export const STAGE6_GATE_HINT_START_MS = 192000
export const STAGE6_GATE_HINT_END_MS = 210000

function readSignal(seenRef, signal, gameKey, now) {
  if (signal.version !== seenRef.current.version) {
    seenRef.current = { version: signal.version, atMs: signal.gameKey === gameKey ? now : -Infinity, kind: signal.kind ?? null, cycle: signal.cycle ?? -1 }
  }
  return seenRef.current
}

export function stage6SpeechCueKind(seen, now) {
  if (!seen || !Number.isFinite(seen.atMs)) return null
  const age = now - seen.atMs
  if (age < 0) return null
  if (seen.kind === 'tutorial' && age < STAGE6_SPEECH_TUTORIAL_MS) return 'speechTutorial'
  // 첫 회차 preCue는 튜토리얼 문구가 이미 덮고 있다(27.5~31.6초) — 짧은 경고는 2회차부터.
  if (seen.kind === 'preCue' && seen.cycle > 0 && age < STAGE6_SPEECH_SHORT_MS) return 'speechShort'
  return null
}

export default function Stage6HudCues({ stageId, phase, gameKey, hidden = false, escapePortalActive = false }) {
  const t = useT()
  const [, setTick] = useState(0)
  const enabled = stageId === 'stage6'
  const active = enabled && phase === 'playing'
  const speechSeenRef = useRef(null)
  const summonSeenRef = useRef(null)
  if (speechSeenRef.current === null) speechSeenRef.current = { version: getAssemblySpeechCueState().version, atMs: -Infinity, kind: null, cycle: -1 }
  if (summonSeenRef.current === null) summonSeenRef.current = { version: getBossSummonWarning().version, atMs: -Infinity }
  useEffect(() => {
    if (!active) return undefined
    const timer = window.setInterval(() => setTick((value) => (value + 1) % 1000000), 50)
    return () => window.clearInterval(timer)
  }, [active])

  if (!enabled) return null
  const now = getRuntimeElapsedMs()
  const speech = readSignal(speechSeenRef, getAssemblySpeechCueState(), gameKey, now)
  const summon = readSignal(summonSeenRef, getBossSummonWarning(), gameKey, now)
  if (!active || hidden) return null

  const speechKind = stage6SpeechCueKind(speech, now)
  const summonAge = now - summon.atMs
  const showSummon = Number.isFinite(summon.atMs) && summonAge >= 0 && summonAge < STAGE6_TRACK_SUMMON_MS
  const showGate = !escapePortalActive && now >= STAGE6_GATE_HINT_START_MS && now < STAGE6_GATE_HINT_END_MS

  return (
    <>
      {speechKind && (
        <div data-testid="stage6-speech-cue" data-kind={speechKind} role="status" aria-live="polite" style={speechKind === 'speechTutorial' ? styles.speechTutorial : styles.speechShort}>
          {t(`hud.stage6.${speechKind}`)}
        </div>
      )}
      {showSummon && (
        <div data-testid="stage6-track-summon" role="alert" aria-live="assertive" style={styles.trackSummon}>
          ⚠ {t('hud.stage6.trackSummon')}
        </div>
      )}
      {showGate && (
        <div data-testid="stage6-gate-hint" role="status" aria-live="polite" style={styles.gateHint}>
          <span aria-hidden="true" style={styles.gateArrow}>↓</span>
          <span>{t('hud.stage6.gateHint')}</span>
        </div>
      )}
    </>
  )
}

const centerTop = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  boxSizing: 'border-box',
  textAlign: 'center',
  fontFamily: uiType.family,
  fontWeight: uiType.weightHeavy,
  pointerEvents: 'none',
}

// 상단 형태 배너·투사체 경고(top 72)와 겹치지 않게 그 아래(top 150)에 둔다. 1줄, 프레임 폭 안.
const styles = {
  speechTutorial: {
    ...centerTop,
    top: 150,
    maxWidth: 'calc(100% - 24px)',
    padding: '8px 14px',
    border: '2px solid #ffd76a',
    borderRadius: 10,
    background: 'rgba(40, 30, 6, 0.92)',
    color: '#fff3c4',
    fontSize: 15,
    lineHeight: 1.25,
    whiteSpace: 'nowrap',
    boxShadow: uiShadows.press,
  },
  speechShort: {
    ...centerTop,
    top: 150,
    padding: '6px 16px',
    border: '2px solid #ffd76a',
    borderRadius: 10,
    background: 'rgba(40, 30, 6, 0.92)',
    color: '#fff3c4',
    fontSize: 20,
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    boxShadow: uiShadows.press,
  },
  trackSummon: {
    ...centerTop,
    top: 196,
    maxWidth: 'calc(100% - 24px)',
    padding: '8px 14px',
    border: '2px solid #ff6a5a',
    borderRadius: 10,
    background: 'rgba(60, 10, 8, 0.92)',
    color: '#ffe2dc',
    fontSize: 15,
    lineHeight: 1.25,
    boxShadow: uiShadows.press,
  },
  // 조이스틱 영역 위: 하단 안전 영역 + 96px.
  gateHint: {
    ...centerTop,
    top: 'auto',
    bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 0px) + 96px)',
    maxWidth: 'calc(100% - 24px)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px',
    border: '2px solid #00d9b5',
    borderRadius: 9,
    background: 'rgba(7, 44, 43, 0.94)',
    color: '#d8fff7',
    fontSize: 14,
    lineHeight: 1.2,
  },
  gateArrow: {
    fontSize: 20,
    lineHeight: 1,
  },
}
