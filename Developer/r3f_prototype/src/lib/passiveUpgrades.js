// localStorage 영구 패시브 저장 계층.
// 미지정/2차 패시브 키는 디스크에 보존하지만 getLevel/getAllLevels에는 카탈로그 키만 노출한다.
import { PASSIVE_CATALOG, getPriceFor, isValidPassiveId } from './passiveCatalog.js'

export const STORAGE_KEY = 'school_survivor:passiveUpgrades'

function readRaw() {
  if (typeof localStorage === 'undefined') return {}
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out = {}
    for (const [k, v] of Object.entries(parsed)) {
      const n = Number(v)
      if (Number.isFinite(n) && n >= 0) out[k] = Math.floor(n)
    }
    return out
  } catch {
    return {}
  }
}

function writeRaw(obj) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

export function load() {
  const raw = readRaw()
  const out = {}
  for (const id of Object.keys(PASSIVE_CATALOG)) {
    out[id] = raw[id] ?? 0
  }
  return out
}

export function getLevel(id) {
  if (!isValidPassiveId(id)) return 0
  return readRaw()[id] ?? 0
}

export function getAllLevels() {
  return load()
}

// 다른 클라이언트 빌드가 저장한 미지정 키는 보존한다.
function persist(id, nextLevel) {
  const raw = readRaw()
  raw[id] = nextLevel
  writeRaw(raw)
}

export function purchase(id, currentGold) {
  if (!isValidPassiveId(id)) return { ok: false, reason: 'unknownId' }
  const entry = PASSIVE_CATALOG[id]
  if (!entry.enabled) return { ok: false, reason: 'disabled' }
  const currentLevel = getLevel(id)
  const nextLevel = currentLevel + 1
  if (nextLevel > entry.maxLevel) return { ok: false, reason: 'maxLevel' }
  const price = getPriceFor(id, nextLevel)
  if (price == null) return { ok: false, reason: 'noPrice' }
  if (currentGold < price) return { ok: false, reason: 'insufficient', price }
  persist(id, nextLevel)
  return { ok: true, nextLevel, price, nextGold: currentGold - price }
}

// 테스트용. 운영 코드에서는 호출하지 않는다.
export function _resetForTests() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
