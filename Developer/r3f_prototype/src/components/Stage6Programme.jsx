import { useEffect, useRef, useState } from 'react'
import { getRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import {
  STAGE6_CELEBRATION_MOMENTS,
  STAGE6_PROGRAMME,
  STAGE6_PROGRAMME_BANNER_MS,
  STAGE6_PROGRAMME_STAGE_ID,
  getStage6ProgrammeEntriesStartedBetween,
  getStage6ProgrammeState,
} from '../lib/stage6Programme.js'
import { enemyPool } from '../lib/refs.js'
import { chiefStatusView } from './ChiefStatusBar.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { getLocale, useT } from '../lib/i18n.js'
import { uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'

// Stage 6 운동회 순서표 줄 + 안내 방송 배너 + 함성 꽃가루(기획서 2번 + 5번, 2026-11-19).
// - 시계: 게임 시계(getRuntimeElapsedMs) — 스테이지 타임라인·Stage6HudCues와 같다. 일시정지·레벨업 카드·대화 동안 멈춘다.
// - 자리: 상단 바(스테이지·시간) 바로 아래 한 줄(안전 영역 위 + 30px, 높이 ~22px). 경고 배너(top 72)·치프 바(112)·
//   훈화(150)·형태 경고(188) 위, 좌상단 퀘스트 가방(44px)·좌측 점수 사이 폭(100% − 136px) 안. 터치를 막지 않는다.
// - 안내 배너: 같은 자리에서 순서표 줄을 2초 대신한다(기존 마일스톤 토스트 모양·milestonePop 애니메이션 재사용).
//   마일스톤 토스트(top 58)가 떠 있으면 줄을 숨기고 배너를 미룬다. 두 항목이 붙어 시작하면 차례로 줄 세운다.
// - phase !== 'playing'(일시정지·레벨업·대화·결과)이면 아무것도 그리지 않고, 그 동안 시작 판정도 하지 않는다.
// - 꽃가루: DOM/CSS만(드로콜 0). prefers-reduced-motion이면 꽃가루를 끄고 배너 애니메이션도 끈다.
// 결승 테이프(정문, 3D)는 threemini 몫 — STAGE6_CELEBRATION_MOMENTS.finishTape 훅만 둔다.
export const STAGE6_PROGRAMME_POLL_MS = 100
// 판정이 늦게 따라잡아도(탭 백그라운드 등) 이보다 오래된 시작은 배너로 내지 않는다.
export const STAGE6_PROGRAMME_STALE_MS = 3000
export const STAGE6_CONFETTI_MS = 1400
const CONFETTI_COLORS = ['#ff5a5a', '#ffd84a', '#4ab0ff', '#ffffff', '#5ad67a', '#ff8ad0']
const CONFETTI_PIECES = 16

function programmeTitle(t, entry) {
  if (!entry) return ''
  return t(`hud.stage6.programme.${entry.id}`, null, getLocale() === 'ko' ? entry.titleKo : entry.titleEn)
}

function freshRun(gameKey, nowMs) {
  return {
    gameKey,
    lastSec: nowMs / 1000,
    queue: [],
    banner: null,          // { key, kind: 'programme' | 'cheer', entry?, cheerId?, startMs }
    confetti: null,        // { key, big, startMs }
    killSamples: [],       // [{ ms, kills }]
    lastMultiKillMs: -Infinity,
    chiefType: null,
    bossDefeated: false,
    serial: 0,
  }
}

export default function Stage6Programme({ stageId, phase, gameKey, hidden = false, deferBanner = false }) {
  const t = useT()
  const [, setTick] = useState(0)
  const enabled = stageId === STAGE6_PROGRAMME_STAGE_ID
  const active = enabled && phase === 'playing'
  const runRef = useRef(null)
  const chiefScratchRef = useRef({ index: -1, typeCode: 0, hp: 0, maxHp: 0 })

  useEffect(() => {
    if (!active) return undefined
    const timer = window.setInterval(() => setTick((value) => (value + 1) % 1000000), STAGE6_PROGRAMME_POLL_MS)
    return () => window.clearInterval(timer)
  }, [active])

  if (!enabled) return null
  const nowMs = getRuntimeElapsedMs()
  const nowSec = nowMs / 1000
  if (!runRef.current || runRef.current.gameKey !== gameKey) runRef.current = freshRun(gameKey, nowMs)
  const run = runRef.current
  if (!active) return null

  // 1) 항목 시작 판정 — 게임 시계가 (lastSec, nowSec]에서 startSec를 지났는가.
  if (nowSec < run.lastSec) run.lastSec = nowSec // 되감기(새 판 같은 키) 방어
  for (const entry of getStage6ProgrammeEntriesStartedBetween(run.lastSec, nowSec)) {
    if (nowMs - entry.startSec * 1000 > STAGE6_PROGRAMME_STALE_MS) continue
    run.serial += 1
    run.queue.push({ key: `p${run.serial}`, kind: 'programme', entry })
    if (entry.startSec > (STAGE6_PROGRAMME[0]?.startSec ?? 0)) run.confetti = { key: `c${run.serial}`, big: false, startMs: nowMs }
  }
  run.lastSec = nowSec

  // 2) 축하 순간 — 다중 처치·치프 처치·보스 처치.
  const store = useGameStore.getState()
  const kills = store.runKills ?? 0
  const multi = STAGE6_CELEBRATION_MOMENTS.multiKill
  run.killSamples.push({ ms: nowMs, kills })
  while (run.killSamples.length > 1 && nowMs - run.killSamples[0].ms > multi.windowMs) run.killSamples.shift()
  const burst = kills - run.killSamples[0].kills
  const cheer = (cheerId, big) => {
    run.serial += 1
    const item = { key: `h${run.serial}`, kind: 'cheer', cheerId }
    // 다중 처치 함성은 장식 — 줄이 비어 있을 때만 낸다. 치프·보스 처치는 항상 줄 세운다.
    if (big || (!run.banner && run.queue.length === 0)) run.queue.push(item)
    run.confetti = { key: `c${run.serial}`, big, startMs: nowMs }
  }
  if (burst >= multi.minKills && nowMs - run.lastMultiKillMs >= multi.cooldownMs) {
    run.lastMultiKillMs = nowMs
    run.killSamples = [{ ms: nowMs, kills }]
    cheer(multi.id, false)
  }
  const chief = chiefStatusView(enemyPool, chiefScratchRef.current)
  if (run.chiefType === STAGE6_CELEBRATION_MOMENTS.chiefDown.chiefType && !chief) cheer(STAGE6_CELEBRATION_MOMENTS.chiefDown.id, true)
  run.chiefType = chief?.type ?? null
  if (store.bossDefeated && !run.bossDefeated) cheer(STAGE6_CELEBRATION_MOMENTS.bossDown.id, true)
  run.bossDefeated = !!store.bossDefeated

  // 3) 배너 줄 — 지금 배너가 끝났으면 다음 것을 꺼낸다. 마일스톤 토스트가 떠 있으면 미룬다.
  if (run.banner && nowMs - run.banner.startMs >= STAGE6_PROGRAMME_BANNER_MS) run.banner = null
  if (!run.banner && !deferBanner && run.queue.length > 0) run.banner = { ...run.queue.shift(), startMs: nowMs }
  if (run.confetti && nowMs - run.confetti.startMs >= STAGE6_CONFETTI_MS) run.confetti = null

  if (hidden) return null

  const state = getStage6ProgrammeState(nowSec)
  const banner = run.banner
  const showStrip = !banner && !deferBanner && (state.current || state.next)

  return (
    <>
      <style>{CSS}</style>
      {showStrip && (
        <div data-testid="stage6-programme-strip" data-current={state.current?.id ?? ''} data-next={state.next?.id ?? ''}
          aria-live="off" title={t('hud.stage6.programme.label')} style={styles.strip}>
          <span aria-hidden="true" style={styles.stripIcon}>📋</span>
          <span data-testid="stage6-programme-current" style={styles.current}>
            {state.current ? programmeTitle(t, state.current) : t('hud.stage6.programme.ready')}
          </span>
          {state.next && (
            <span data-testid="stage6-programme-next" style={styles.nextWrap}>
              <span aria-hidden="true" style={styles.nextArrow}>▸</span>
              <span style={styles.nextTitle}>{programmeTitle(t, state.next)}</span>
              <span style={styles.nextSec}>{t('hud.stage6.programme.nextIn', { sec: Math.ceil(state.secondsToNext) })}</span>
            </span>
          )}
          <span aria-hidden="true" style={styles.progressTrack}>
            <span data-testid="stage6-programme-progress" style={{ ...styles.progressFill, width: `${Math.round(state.progress * 100)}%` }} />
          </span>
        </div>
      )}
      {banner && (
        <div key={banner.key} data-testid="stage6-programme-banner" data-kind={banner.kind} data-id={banner.entry?.id ?? banner.cheerId}
          className="s6p-banner" role="status" aria-live="polite"
          style={banner.kind === 'cheer' ? styles.cheerBanner : styles.banner}>
          {banner.kind === 'programme'
            ? t('hud.stage6.programme.announce', { title: programmeTitle(t, banner.entry) })
            : t(`hud.stage6.programme.shout.${banner.cheerId}`)}
        </div>
      )}
      {run.confetti && (
        <div key={run.confetti.key} data-testid="stage6-confetti" data-big={run.confetti.big ? '1' : '0'} className="s6p-confetti" aria-hidden="true" style={styles.confettiLayer}>
          {Array.from({ length: run.confetti.big ? CONFETTI_PIECES * 2 : CONFETTI_PIECES }, (_, i) => (
            <span key={i} className="s6p-piece" style={confettiPieceStyle(i, run.confetti.big)} />
          ))}
        </div>
      )}
    </>
  )
}

// 결정론적 배치(난수 없음): 조각 i의 시작 x·지연·회전·색을 i로만 정한다.
function confettiPieceStyle(i, big) {
  const count = big ? CONFETTI_PIECES * 2 : CONFETTI_PIECES
  const x = ((i * 37) % 100) / 100
  const spread = big ? 100 : 60
  return {
    left: `${50 - spread / 2 + x * spread}%`,
    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    animationDelay: `${(i % 5) * 60}ms`,
    animationDuration: `${900 + ((i * 53) % 400)}ms`,
    '--s6p-dx': `${((i * 29) % 41) - 20}px`,
    '--s6p-rot': `${(i * 67) % 360}deg`,
    width: i % 3 === 0 ? 8 : 6,
    height: i % 3 === 0 ? 5 : 8,
    zIndex: count - i,
  }
}

const SAFE_TOP = 'max(14px, env(safe-area-inset-top, 0px))'

const CSS = `
.s6p-banner { animation: milestonePop 2s ease-in-out forwards; }
.s6p-piece { position:absolute; top:0; border-radius:1px; opacity:0; animation-name:s6pFall; animation-timing-function:cubic-bezier(.2,.6,.4,1); animation-fill-mode:forwards; will-change:transform,opacity; }
@keyframes s6pFall {
  0% { opacity:1; transform:translate(0,0) rotate(0deg); }
  100% { opacity:0; transform:translate(var(--s6p-dx), 190px) rotate(var(--s6p-rot)); }
}
@media (prefers-reduced-motion: reduce) {
  .s6p-banner { animation: none; }
  .s6p-confetti { display: none; }
}
`

const styles = {
  strip: {
    position: 'absolute',
    top: `calc(${SAFE_TOP} + 30px)`,
    left: '50%',
    transform: 'translateX(-50%)',
    boxSizing: 'border-box',
    maxWidth: 'calc(100% - 136px)',
    height: 22,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '0 8px 2px',
    border: '1px solid rgba(255, 230, 150, 0.55)',
    borderRadius: 11,
    background: 'rgba(10, 18, 12, 0.86)',
    color: '#fff4cf',
    fontFamily: uiType.family,
    fontSize: 12,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  stripIcon: { fontSize: 11, flex: '0 0 auto' },
  // 좁은 화면(360px)에서는 지금 항목 제목부터 말줄임으로 줄고(다음 항목이 소식이다), 남은 초는 항상 보인다.
  current: { fontWeight: uiType.weightHeavy, color: '#ffe27a', flex: '0 4 auto', minWidth: 28, overflow: 'hidden', textOverflow: 'ellipsis' },
  nextWrap: { display: 'flex', alignItems: 'center', gap: 4, flex: '0 1 auto', minWidth: 0, fontWeight: 700, color: '#e9f3ea' },
  nextArrow: { flex: '0 0 auto', color: '#ffd84a' },
  nextTitle: { flex: '0 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' },
  nextSec: { flex: '0 0 auto', fontFamily: uiType.numeric, fontVariantNumeric: 'tabular-nums', color: '#ffffff' },
  progressTrack: {
    position: 'absolute', left: 10, right: 10, bottom: 2, height: 2, borderRadius: 1, background: 'rgba(255, 255, 255, 0.18)', overflow: 'hidden',
  },
  progressFill: { display: 'block', height: '100%', background: '#ffd84a', transition: 'width 0.1s linear' },
  // 기존 마일스톤 토스트(종이 + 굵은 테두리 + milestonePop)와 같은 모양. 순서표 줄 자리에 2초.
  banner: {
    position: 'absolute',
    top: `calc(${SAFE_TOP} + 26px)`,
    left: '50%',
    transform: 'translateX(-50%)',
    boxSizing: 'border-box',
    maxWidth: 'calc(100% - 136px)',
    padding: '6px 12px',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.paper,
    color: uiPalette.ink,
    boxShadow: uiShadows.pressSmall,
    fontFamily: uiType.family,
    fontSize: 14,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1.15,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    pointerEvents: 'none',
  },
  cheerBanner: {
    position: 'absolute',
    top: `calc(${SAFE_TOP} + 26px)`,
    left: '50%',
    transform: 'translateX(-50%)',
    boxSizing: 'border-box',
    maxWidth: 'calc(100% - 136px)',
    padding: '6px 12px',
    border: uiBorders.strong,
    borderRadius: 8,
    background: '#ffe27a',
    color: uiPalette.ink,
    boxShadow: uiShadows.pressSmall,
    fontFamily: uiType.family,
    fontSize: 14,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1.15,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    pointerEvents: 'none',
  },
  confettiLayer: {
    position: 'absolute',
    top: `calc(${SAFE_TOP} + 40px)`,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(100%, 420px)',
    height: 0,
    overflow: 'visible',
    pointerEvents: 'none',
  },
}
