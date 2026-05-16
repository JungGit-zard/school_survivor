// 플레이테스트 로그 — 한 게임 동안 발생한 주요 이벤트를 메모리에 기록한다.
// useGameStore의 변화에 반응해 자동 기록. 게임오버/클리어 모달의 "📋 로그 복사" 버튼이
// buildPlaytestSummary()를 호출해 JSON으로 클립보드에 복사 → 채팅에 붙여넣기.
// 사용처는 App.jsx에서 1회 import (사이드 이펙트로 초기화).

import { useGameStore } from '../store/useGameStore.js'

const events = []
let startMs = null
let lastLevel = 1
const seenWeapons = new Set()

function reset() {
  events.length = 0
  startMs = performance.now()
  lastLevel = 1
  seenWeapons.clear()
  events.push({ t: 0, type: 'start' })
  // 시작 시점에 이미 active인 무기(연필)는 기본 해금이므로 기록만 남긴다.
  const w = useGameStore.getState().weapons
  for (const [k, wpn] of Object.entries(w)) {
    if (wpn.active) seenWeapons.add(k)
  }
}

function record(type, payload = {}) {
  if (startMs === null) reset()
  events.push({
    t: +((performance.now() - startMs) / 1000).toFixed(2),
    type,
    ...payload,
  })
}

let initialized = false

export function initPlaytestLogger() {
  if (initialized) return
  initialized = true
  reset()

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
    events: [...events],
  }
}
