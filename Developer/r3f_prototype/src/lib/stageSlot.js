// 판 도중 기록의 기기 보관 칸(Terry 2026-11-19).
// 로그인 계정이 지금 하고 있는 스테이지 하나의 기록(처치·주운 골드·레벨업·생존 초·보스·미션 카운터 등)만
// 기기(localStorage)에 둔다. 계정마다 칸은 하나뿐이다 — 새 스테이지를 시작하면 이전 칸을 덮어쓰므로
// 기기에는 한 스테이지 분량을 넘는 기록이 절대 쌓이지 않는다. 스테이지가 끝나면 firebaseProgress가
// 결과를 한 번 클라우드에 쓰고 이 칸을 지운다. 탭이 판 도중 닫혔으면 다음 로그인 때 한 번 회수된다.
// 게스트는 칸을 열지 않는다. 저장소가 없거나 던져도 게임은 똑같이 돈다(모든 접근이 try/catch).

const KEY_PREFIX = 'school_survivor:stageSlot:'
const SLOT_VERSION = 1
export const STAGE_SLOT_MAX_BYTES = 4096
const MAX_SLOT_COUNTER_KEYS = 128
const WRITE_INTERVAL_MS = 1000
const RUN_KEY_PATTERN = /^[A-Za-z0-9_-]{1,128}$/
const STAGE_ID_PATTERN = /^stage([1-9]|10)$/

let live = null
let dirty = false
let lastWriteAt = 0
let writeTimer = null
let lifecycleInstalled = false

function storage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function slotKey(uid) {
  return `${KEY_PREFIX}${uid}`
}

export function toStageRunKey(runId) {
  const key = String(runId ?? '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 128)
  return RUN_KEY_PATTERN.test(key) ? key : ''
}

function installLifecycleFlush() {
  if (lifecycleInstalled || typeof window === 'undefined') return
  lifecycleInstalled = true
  try {
    window.addEventListener('pagehide', flushStageSlot)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushStageSlot()
    })
  } catch { /* 저장소 미러는 보조 수단이다. */ }
}

// 새 스테이지의 칸을 연다. 같은 계정의 이전 칸은 무조건 덮어쓴다(한 칸 규칙).
export function openStageSlot({ uid, runId, stageId, at = Date.now() }) {
  const runKey = toStageRunKey(runId)
  if (typeof uid !== 'string' || !uid || !runKey || !STAGE_ID_PATTERN.test(stageId)) {
    live = null
    return null
  }
  live = {
    v: SLOT_VERSION,
    uid,
    runKey,
    stageId,
    at,
    records: { totalRuns: 1 },
    best: { bestSurvivalSeconds: 0 },
    gold: 0,
    goldSpent: 0,
    missionCounters: {},
    bossPassiveUnlocks: {},
    encounteredZombieTypes: {},
  }
  installLifecycleFlush()
  writeNow()
  return live
}

export function getLiveStageSlot() {
  return live
}

export function getLiveStageRunKey() {
  return live?.runKey ?? ''
}

// 메모리의 칸을 닫는다. 기기 사본은 클라우드 저장이 확인된 뒤 clearStoredStageSlot이 지운다.
export function closeLiveStageSlot(runKey) {
  if (!live || live.runKey !== runKey) return null
  const closed = live
  if (dirty) writeNow()
  live = null
  return closed
}

export function setStageSlotTotals({ records, best, gold }) {
  if (!live) return
  live.records = { ...records }
  live.best = { ...best }
  live.gold = gold
  markDirty()
}

export function addStageSlotMissionChanges(changes) {
  if (!live) return
  for (const { key, value, mode } of changes) {
    if (!(key in live.missionCounters) && Object.keys(live.missionCounters).length >= MAX_SLOT_COUNTER_KEYS) continue
    const previous = live.missionCounters[key] ?? 0
    live.missionCounters[key] = mode === 'max' ? Math.max(previous, value) : previous + value
  }
  markDirty()
}

export function addStageSlotGoldSpent(amount) {
  if (!live || !(amount > 0)) return
  live.goldSpent += amount
  markDirty()
}

export function noteStageSlotBossPassive(unlocks) {
  if (!live) return
  for (const [key, value] of Object.entries(unlocks ?? {})) if (value === true) live.bossPassiveUnlocks[key] = true
  markDirty()
}

export function noteStageSlotEncounter(type) {
  if (!live || live.encounteredZombieTypes[type] === 1) return
  live.encounteredZombieTypes[type] = 1
  markDirty()
}

function markDirty() {
  dirty = true
  if (writeTimer) return
  const wait = Math.max(0, lastWriteAt + WRITE_INTERVAL_MS - Date.now())
  if (wait === 0) {
    writeNow()
    return
  }
  writeTimer = setTimeout(() => {
    writeTimer = null
    if (dirty) writeNow()
  }, wait)
}

export function flushStageSlot() {
  if (dirty) writeNow()
}

function writeNow() {
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = null
  }
  dirty = false
  lastWriteAt = Date.now()
  if (!live) return
  try {
    const text = JSON.stringify(live)
    if (text.length > STAGE_SLOT_MAX_BYTES) return
    storage()?.setItem(slotKey(live.uid), text)
  } catch { /* 저장소가 없거나 가득 차도 플레이는 계속된다. */ }
}

export function readStoredStageSlot(uid) {
  if (typeof uid !== 'string' || !uid) return null
  let parsed = null
  try {
    const text = storage()?.getItem(slotKey(uid))
    if (!text || text.length > STAGE_SLOT_MAX_BYTES) return null
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || parsed.v !== SLOT_VERSION || parsed.uid !== uid) return null
  if (!RUN_KEY_PATTERN.test(parsed.runKey) || !STAGE_ID_PATTERN.test(parsed.stageId)) return null
  return parsed
}

// runKey를 주면 그 스테이지의 칸일 때만 지운다(이미 다음 스테이지 칸이면 건드리지 않는다).
export function clearStoredStageSlot(uid, runKey = null) {
  if (typeof uid !== 'string' || !uid) return
  try {
    const store = storage()
    if (!store) return
    if (runKey) {
      const text = store.getItem(slotKey(uid))
      if (!text) return
      let stored = null
      try { stored = JSON.parse(text) } catch { stored = null }
      if (stored?.runKey !== runKey) return
    }
    store.removeItem(slotKey(uid))
  } catch { /* 저장소 실패는 무시한다. */ }
}

export function _resetStageSlotForTests() {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = null
  live = null
  dirty = false
  lastWriteAt = 0
}
