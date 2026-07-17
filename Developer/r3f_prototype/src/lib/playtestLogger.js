// 플레이테스트 로그 — 한 게임 동안 발생한 주요 이벤트를 메모리에 기록한다.
// useGameStore의 변화에 반응해 자동 기록. 게임오버/클리어 모달의 "📋 로그 복사" 버튼이
// buildPlaytestSummary()를 호출해 JSON으로 클립보드에 복사 → 채팅에 붙여넣기.
// 사용처는 App.jsx에서 1회 import (사이드 이펙트로 초기화).

import { useGameStore } from '../store/useGameStore.js'

const events = []
let startMs = null
let lastLevel = 1
let totalKills = 0
let totalDamageTaken = 0
let totalPickups = 0
const seenWeapons = new Set()
const runtimeLogEnabled = import.meta.env.DEV
  && import.meta.env.VITE_PLAYTEST_LOGGING === '1'
const clientSessionId = globalThis.crypto?.randomUUID?.()
  ?? `session-${Date.now()}`
const CONSOLE_LEVELS = ['debug', 'info', 'log', 'warn', 'error']

function reset() {
  events.length = 0
  startMs = performance.now()
  lastLevel = 1
  totalKills = 0
  totalDamageTaken = 0
  totalPickups = 0
  seenWeapons.clear()
  const startEvent = { t: 0, type: 'start' }
  events.push(startEvent)
  emitRuntimeLog('playtest', startEvent)
  // 시작 시점에 이미 active인 무기(연필)는 기본 해금이므로 기록만 남긴다.
  const w = useGameStore.getState().weapons
  for (const [k, wpn] of Object.entries(w)) {
    if (wpn.active) seenWeapons.add(k)
  }
}

function record(type, payload = {}) {
  if (startMs === null) reset()
  const event = {
    t: +((performance.now() - startMs) / 1000).toFixed(2),
    type,
    ...payload,
  }
  events.push(event)
  emitRuntimeLog('playtest', event)
}

let initialized = false

export function initPlaytestLogger() {
  if (initialized) return
  initialized = true
  reset()
  initRuntimeLogCapture()

  // 레벨 상승
  useGameStore.subscribe(
    (s) => s.player.level,
    (level) => {
      if (level > lastLevel) {
        record('levelup', { level })
        lastLevel = level
      }
    }
  )

  // 무기 해금 (active=false → true 전환)
  useGameStore.subscribe(
    (s) => s.weapons,
    (weapons) => {
      for (const [k, w] of Object.entries(weapons)) {
        if (w.active && !seenWeapons.has(k)) {
          seenWeapons.add(k)
          record('unlock', { weapon: k, label: w.label })
        }
      }
    }
  )

  // 게임 종료
  useGameStore.subscribe(
    (s) => s.phase,
    (phase) => {
      if (phase === 'gameover' || phase === 'cleared') {
        record('end', { result: phase })
      }
    }
  )

  // 게임 리셋 (gameKey 증분)
  useGameStore.subscribe(
    (s) => s.gameKey,
    () => reset()
  )
}

function initRuntimeLogCapture() {
  if (!runtimeLogEnabled || typeof window === 'undefined') return

  for (const level of CONSOLE_LEVELS) {
    const original = console[level].bind(console)
    console[level] = (...args) => {
      original(...args)
      emitRuntimeLog('console', {
        level,
        args: args.map(serializeLogValue),
      })
    }
  }

  window.addEventListener('error', (event) => {
    emitRuntimeLog('runtime-error', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    emitRuntimeLog('unhandled-rejection', {
      reason: serializeLogValue(event.reason),
    })
  })

  window.setInterval(() => {
    const state = useGameStore.getState()
    emitRuntimeLog('state', {
      phase: state.phase,
      stageId: state.currentStageId,
      elapsedMs: state.elapsedMs,
      player: {
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        level: state.player.level,
        xp: state.player.xp,
      },
      bossSpawned: state.bossSpawned,
      runKills: state.runKills,
      goldSession: state.goldSession,
    })
  }, 2000)

  window.addEventListener('beforeunload', () => {
    emitRuntimeLog('session-end', buildPlaytestSummary(), true)
  })
  emitRuntimeLog('session-start', {
    href: window.location.href,
    userAgent: navigator.userAgent,
  })
}

function emitRuntimeLog(category, payload, useBeacon = false) {
  if (!runtimeLogEnabled || typeof window === 'undefined') return

  const body = JSON.stringify({
    clientSessionId,
    clientTime: new Date().toISOString(),
    category,
    payload,
  })
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon('/__playtest-log', body)
    return
  }
  void fetch('/__playtest-log', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

function serializeLogValue(value) {
  if (value instanceof Error) return value.stack || value.message
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

// 외부 호출 — 게임 코드에서 킬/피격/픽업 시 호출한다.
export function logKill(enemyType) {
  totalKills += 1
  record('kill', { enemyType, totalKills })
}

export function logDamageTaken(amount, hp) {
  totalDamageTaken += amount
  record('hit', { damage: amount, hp, totalDamageTaken })
}

export function logPickup(pickupType, value) {
  totalPickups += 1
  record('pickup', { pickupType, value, totalPickups })
}

export function logPlaytestEvent(type, payload) {
  record(type, payload)
}

function formatMs(ms) {
  const sec = Math.floor(ms / 1000)
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

// 게임 종료 시점의 전체 상태를 직렬화한다.
export function buildPlaytestSummary() {
  const state = useGameStore.getState()
  const activeWeapons = Object.entries(state.weapons)
    .filter(([, w]) => w.active)
    .map(([k, w]) => ({ key: k, label: w.label, level: w.level }))

  return {
    runId: new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-'),
    duration: formatMs(state.elapsedMs),
    durationMs: state.elapsedMs,
    finalLevel: state.player.level,
    finalXp: state.player.xp,
    xpToNext: state.player.xpToNext,
    result: state.phase, // 'gameover' | 'cleared' | 기타
    weapons: activeWeapons,
    goldSession: state.goldSession,
    goldTotal: state.goldTotal,
    stats: { totalKills, totalDamageTaken, totalPickups },
    events: [...events],
  }
}
