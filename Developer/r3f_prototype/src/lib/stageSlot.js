// 판 도중 기록의 기기 보관 칸(Terry 2026-11-19, 2026-11-21).
// AGENTS.md의 브라우저 저장소 금지에서 이름으로 허용된 유일한 예외다(Terry 2026-11-21). 이 모듈만 localStorage를 쓴다.
//
// 1) 진행 칸(live slot): 로그인 계정이 지금 하고 있는 스테이지 하나의 기록(처치·주운 골드·레벨업·생존 초·보스·
//    미션 카운터 등). 계정마다 키 하나 — 기기에는 판 도중 기록이 한 스테이지 분량을 넘지 않는다.
// 2) 보내는 중(pending send): 끝났지만 서버 확인을 아직 못 받은 스테이지 결과. 서버가 받았다고 확인하기 전에는
//    지우지 않는다(데이터 유실 방지). 오프라인으로 여러 스테이지를 연달아 끝내면 여러 개가 남을 수 있지만, 모두
//    "끝난 결과"이지 판 도중 기록이 아니다. 확인되면 바로 지운다.
// 탭이 판 도중 닫혔으면 다음 로그인 때 그 칸을 결과로 한 번 보낸다. 같은 결과가 두 번 더해지지 않는 것은 서버 규칙
// (runLedger 행 1회 쓰기 + resultWrites)이 보장하고, 여기서는 Web Locks로 아직 살아 있는 탭의 칸을 다른 탭이
// 가로채지 않게 한다. 게스트는 칸을 열지 않는다. 저장소가 없거나 던져도 게임은 똑같이 돈다(모든 접근이 try/catch).

const KEY_PREFIX = 'school_survivor:stageSlot:'
const PENDING_PREFIX = 'school_survivor:stagePending:'
const LOCK_PREFIX = 'school_survivor:run:'
const SLOT_VERSION = 1
export const STAGE_SLOT_MAX_BYTES = 4096
const MAX_PENDING_RESULTS = 64
const MAX_SLOT_COUNTER_KEYS = 128
const WRITE_INTERVAL_MS = 1000
// Without Web Locks, a live slot written this recently (and not marked closed by pagehide) is treated as
// still owned by another open tab.
export const LIVE_SLOT_STALE_MS = 20000
const RUN_KEY_PATTERN = /^[A-Za-z0-9_-]{1,128}$/
const STAGE_ID_PATTERN = /^stage([1-9]|10)$/

let live = null
let dirty = false
let lastWriteAt = 0
let writeTimer = null
let lifecycleInstalled = false
const heldLocks = new Map()

function slotKey(uid) {
  return `${KEY_PREFIX}${uid}`
}

function pendingKey(uid, runKey) {
  return `${PENDING_PREFIX}${uid}:${runKey}`
}

function readItem(key) {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeItem(key, text) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, text)
    return true
  } catch {
    return false
  }
}

function removeItem(key) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
  } catch { /* 저장소 실패는 무시한다. */ }
}

function listKeys(prefix) {
  const keys = []
  try {
    if (typeof localStorage === 'undefined') return keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (typeof key === 'string' && key.startsWith(prefix)) keys.push(key)
    }
  } catch { /* 저장소 실패는 빈 목록이다. */ }
  return keys
}

export function toStageRunKey(runId) {
  const key = String(runId ?? '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 128)
  return RUN_KEY_PATTERN.test(key) ? key : ''
}

function installLifecycleFlush() {
  if (lifecycleInstalled || typeof window === 'undefined') return
  lifecycleInstalled = true
  try {
    window.addEventListener('pagehide', () => {
      // The tab may be closing: mark the slot so another tab can claim it at once.
      if (live) {
        live.closedAt = Date.now()
        writeNow()
      }
    })
    window.addEventListener('pageshow', () => {
      if (live && live.closedAt) {
        delete live.closedAt
        writeNow()
      }
    })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushStageSlot()
    })
  } catch { /* 저장소 미러는 보조 수단이다. */ }
}

// --- Web Locks: the tab that owns a stage holds its lock until the result is confirmed -------------

function locksApi() {
  try {
    const locks = globalThis.navigator?.locks
    return locks && typeof locks.request === 'function' ? locks : null
  } catch {
    return null
  }
}

export function hasRunLocks() {
  return !!locksApi()
}

export function holdRunLock(runKey) {
  const locks = locksApi()
  if (!locks || !runKey || heldLocks.has(runKey)) return
  let release
  const held = new Promise(resolve => { release = resolve })
  heldLocks.set(runKey, release)
  try {
    locks.request(`${LOCK_PREFIX}${runKey}`, () => held).catch(() => heldLocks.delete(runKey))
  } catch {
    heldLocks.delete(runKey)
  }
}

export function releaseRunLock(runKey) {
  const release = heldLocks.get(runKey)
  if (!release) return
  heldLocks.delete(runKey)
  release()
}

export function isRunLockHeldHere(runKey) {
  return heldLocks.has(runKey)
}

// Runs task while holding runKey's lock, or resolves { skipped: true } when another tab holds it.
export async function withFreeRunLock(runKey, task) {
  const locks = locksApi()
  if (!locks) return { skipped: false, value: await task() }
  try {
    return await locks.request(`${LOCK_PREFIX}${runKey}`, { ifAvailable: true }, async lock => {
      if (!lock) return { skipped: true }
      return { skipped: false, value: await task() }
    })
  } catch {
    return { skipped: true }
  }
}

// --- live slot ------------------------------------------------------------------------------------

// 새 스테이지의 칸을 연다. 같은 계정 칸에 다른 스테이지가 남아 있으면 덮어쓰기 전에 "보내는 중"으로 옮긴다
// (닫힌 탭이 남긴 기록을 잃지 않는다). 아직 살아 있는 다른 탭의 칸이었다면 그 탭이 끝날 때 자기 결과로 덮는다.
export function openStageSlot({ uid, runId, stageId, at = Date.now() }) {
  const runKey = toStageRunKey(runId)
  if (typeof uid !== 'string' || !uid || !runKey || !STAGE_ID_PATTERN.test(stageId)) {
    live = null
    return null
  }
  const leftover = readStoredStageSlot(uid)
  if (leftover && leftover.runKey !== runKey && !readPendingStageResult(uid, leftover.runKey)) {
    savePendingStageResult({ ...leftover, fromLive: true })
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
  holdRunLock(runKey)
  installLifecycleFlush()
  writeNow({ force: true })
  return live
}

export function getLiveStageSlot() {
  return live
}

export function getLiveStageRunKey() {
  return live?.runKey ?? ''
}

// 메모리의 칸을 닫는다. 결과는 호출자가 "보내는 중"으로 옮기고, 진행 칸은 지운다.
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

function writeNow({ force = false } = {}) {
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = null
  }
  dirty = false
  lastWriteAt = Date.now()
  if (!live) return
  // Another tab of the same account started a newer stage: leave its slot alone.
  const stored = force ? null : readStoredStageSlot(live.uid)
  if (stored && stored.runKey !== live.runKey && stored.at > live.at) return
  live.savedAt = lastWriteAt
  const text = JSON.stringify(live)
  if (text.length > STAGE_SLOT_MAX_BYTES) return
  writeItem(slotKey(live.uid), text)
}

function parseEntry(text, uid) {
  if (!text || text.length > STAGE_SLOT_MAX_BYTES) return null
  let parsed = null
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || parsed.v !== SLOT_VERSION || parsed.uid !== uid) return null
  if (!RUN_KEY_PATTERN.test(parsed.runKey) || !STAGE_ID_PATTERN.test(parsed.stageId)) return null
  return parsed
}

export function readStoredStageSlot(uid) {
  if (typeof uid !== 'string' || !uid) return null
  return parseEntry(readItem(slotKey(uid)), uid)
}

// True when the stored live slot probably belongs to a tab that is still open (no Web Locks fallback).
export function isStoredSlotFresh(slot, now = Date.now()) {
  if (!slot || slot.closedAt) return false
  const savedAt = Number(slot.savedAt)
  return Number.isFinite(savedAt) && now - savedAt < LIVE_SLOT_STALE_MS
}

// runKey를 주면 그 스테이지의 칸일 때만 지운다(이미 다음 스테이지 칸이면 건드리지 않는다).
export function clearStoredStageSlot(uid, runKey = null) {
  if (typeof uid !== 'string' || !uid) return
  if (runKey) {
    const stored = readStoredStageSlot(uid)
    if (stored?.runKey !== runKey) return
  }
  removeItem(slotKey(uid))
}

// --- pending send (finished, not yet confirmed by the server) --------------------------------------

export function savePendingStageResult(result) {
  const uid = result?.uid
  const runKey = result?.runKey
  if (typeof uid !== 'string' || !uid || !RUN_KEY_PATTERN.test(runKey ?? '') || !STAGE_ID_PATTERN.test(result.stageId ?? '')) return false
  const key = pendingKey(uid, runKey)
  if (!readItem(key) && listKeys(`${PENDING_PREFIX}${uid}:`).length >= MAX_PENDING_RESULTS) return false
  const text = JSON.stringify({ ...result, v: SLOT_VERSION })
  if (text.length > STAGE_SLOT_MAX_BYTES) return false
  return writeItem(key, text)
}

export function readPendingStageResult(uid, runKey) {
  if (typeof uid !== 'string' || !uid || !RUN_KEY_PATTERN.test(runKey ?? '')) return null
  const entry = parseEntry(readItem(pendingKey(uid, runKey)), uid)
  return entry?.runKey === runKey ? entry : null
}

export function listPendingStageResults(uid) {
  if (typeof uid !== 'string' || !uid) return []
  const prefix = `${PENDING_PREFIX}${uid}:`
  return listKeys(prefix)
    .map(key => parseEntry(readItem(key), uid))
    .filter(entry => entry && pendingKey(uid, entry.runKey).length > 0)
    .sort((a, b) => a.at - b.at)
}

// How many times the server refused this result (Terry 2026-11-21: given up after 3). Kept inside the
// result's own device record (the pending copy, or the live slot when that is the only copy), so the
// count survives a reload without another storage key. False when no device record holds this run.
export function noteStageResultRejections(uid, runKey, rejects) {
  const count = Math.max(0, Math.floor(Number(rejects) || 0))
  const pending = readPendingStageResult(uid, runKey)
  if (pending) {
    const text = JSON.stringify({ ...pending, rejects: count })
    return text.length <= STAGE_SLOT_MAX_BYTES && writeItem(pendingKey(uid, runKey), text)
  }
  const stored = readStoredStageSlot(uid)
  if (stored?.runKey !== runKey) return false
  if (live?.runKey === runKey) live.rejects = count
  const text = JSON.stringify({ ...stored, rejects: count })
  return text.length <= STAGE_SLOT_MAX_BYTES && writeItem(slotKey(uid), text)
}

export function removePendingStageResult(uid, runKey) {
  if (typeof uid !== 'string' || !uid || !runKey) return
  removeItem(pendingKey(uid, runKey))
}

// Account deletion: every device copy of this account goes.
export function removeAllStageData(uid) {
  if (typeof uid !== 'string' || !uid) return
  removeItem(slotKey(uid))
  for (const key of listKeys(`${PENDING_PREFIX}${uid}:`)) removeItem(key)
}

export function _resetStageSlotForTests() {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = null
  live = null
  dirty = false
  lastWriteAt = 0
  for (const release of heldLocks.values()) release()
  heldLocks.clear()
}
