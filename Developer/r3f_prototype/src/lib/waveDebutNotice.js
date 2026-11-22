// 웨이브 특수 첫 등장 안내 (2026-11-22, Terry 웨이브 표준 3단계 — uimini).
//   한 판에서 어떤 특수 종이 처음 나오면 2.5초짜리 짧은 자막을 띄운다: 역할 색 점 + 좀비 이름 + 2~5단어 역할 줄.
//   "미션은 자연스럽게" 결 — 모달이 아니라 자막. 게임을 멈추지 않고 입력도 받지 않는다(pointer-events 없음).
//
// 규칙:
//   - 스테이지 1~6(웨이브 표준이 있는 스테이지)의 특수만. 밥줄(역할 없음)·보스·치프·크루·7~10 스테이지는 안내하지 않는다.
//   - 한 판에 종마다 한 번. 여럿이 한꺼번에 처음 나오면 줄을 세워 하나씩만 보여 준다.
//   - 가려진 동안(경고 배너·대화·가방·일시정지, 같은 자리를 쓰는 스테이지 안내)에는 시간이 멈춘다. 줄에서 12초(게임 시계)
//     넘게 기다린 안내는 '첫 등장' 의미가 없으니 버린다.
//   - 판 단위 메모리 상태만. localStorage·클라우드 저장 없음.
// 연결: components/Enemies.jsx spawnPooledEnemy → announceWaveSpecialSpawn → components/WaveDebutToast.jsx(HUD).

import { WAVE_ROLE_COLORS, WAVE_ROLE_COUNT, WAVE_ROLE_KEYS, waveRoleCode } from './waveRoleMarker.js'
import { hasWaveStandard, isWaveExemptType } from './waveComposition.js'

export const WAVE_DEBUT_SHOW_MS = 2500
export const WAVE_DEBUT_STALE_MS = 12000

// 역할 키 → 한국어 역할 줄(정본). en/ja는 로케일 사전의 waveDebut.role.<key>.
export const WAVE_DEBUT_ROLE_LINES = Object.freeze({
  tank: '탱크 · 단단함',
  rush: '돌진 · 빠르게 달려듦',
  ranged: '원거리 · 멀리서 공격',
  zone: '장판 · 바닥 위험',
  ambush: '기습 · 숨었다 튀어나옴',
  support: '지원 · 동료 강화',
  split: '분열 · 쪼개짐',
  disrupt: '방해 · 교란',
  melee: '근접기술 · 붙으면 위험',
  formation: '편대 · 무리 지어 옴',
})

const toCss = (hex) => `#${hex.toString(16).padStart(6, '0').toUpperCase()}`

// 역할(한국어 이름·키·코드) → { code, key, line, color('#RRGGBB') }. 역할이 없으면 null.
export function waveDebutRoleInfo(role) {
  const code = waveRoleCode(role)
  if (!code || code >= WAVE_ROLE_COUNT) return null
  const key = WAVE_ROLE_KEYS[code]
  return { code, key, line: WAVE_DEBUT_ROLE_LINES[key], color: toCss(WAVE_ROLE_COLORS[code]) }
}

export function createWaveDebutQueue() {
  return { seen: new Set(), queue: [], current: null, shownMs: 0 }
}

// 특수 한 마리가 실제로 나왔다. 이 판 첫 등장이면 줄에 넣고 true.
export function noteWaveDebut(q, { type, waveRole, stageId, atMs = 0 } = {}) {
  if (!q || typeof type !== 'string' || q.seen.has(type)) return false
  if (!hasWaveStandard(stageId) || isWaveExemptType(type)) return false
  const code = waveRoleCode(waveRole)
  if (!code) return false
  q.seen.add(type)
  q.queue.push({ type, code, key: WAVE_ROLE_KEYS[code], atMs: Number.isFinite(atMs) ? atMs : 0 })
  return true
}

// dtMs만큼 시간을 흘리고 지금 보여 줄 안내(없으면 null)를 돌려준다. blocked면 아무것도 보여 주지 않고 보이는 시간도 멈춘다.
// nowMs = 게임 시계(줄에서 너무 오래 기다린 안내를 버릴 때만 쓴다).
export function advanceWaveDebut(q, dtMs, { blocked = false, nowMs = 0 } = {}) {
  if (!q) return null
  if (blocked) return null
  if (q.current) {
    q.shownMs += Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0
    if (q.shownMs < WAVE_DEBUT_SHOW_MS) return q.current
    q.current = null
  }
  while (q.queue.length > 0) {
    const next = q.queue.shift()
    if (nowMs - next.atMs > WAVE_DEBUT_STALE_MS) continue
    q.current = next
    q.shownMs = 0
    return next
  }
  return null
}

export function isWaveDebutIdle(q) {
  return !q || (!q.current && q.queue.length === 0)
}

// 스폰 경로(Enemies) → HUD 다리. 듣는 쪽은 HUD의 WaveDebutToast 하나뿐이다. 특수 스폰마다 불리므로 할당 없이 넘긴다.
let listener = null
export function setWaveDebutListener(fn) {
  listener = typeof fn === 'function' ? fn : null
  return () => { if (listener === fn) listener = null }
}
export function announceWaveSpecialSpawn(type, waveRole) {
  if (listener && waveRole) listener(type, waveRole)
}
