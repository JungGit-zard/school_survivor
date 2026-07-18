// Firebase runtime memory passive upgrade layer.
// Durable player persistence is users/{uid} in Firebase only.
import { PASSIVE_CATALOG, getPriceFor, isValidPassiveId } from './passiveCatalog.js'
import { _seedHydratedFirebaseProgressForTests, readFirebasePlayerProgress, updateFirebasePlayerProgress } from './firebaseProgress.js'

export const STORAGE_KEY = 'school_survivor:passiveUpgrades'

function readRaw() {
  return readFirebasePlayerProgress().passiveUpgrades ?? {}
}

function updateRaw(mutator) {
  updateFirebasePlayerProgress((progress) => {
    const raw = { ...(progress.passiveUpgrades ?? {}) }
    mutator(raw)
    progress.passiveUpgrades = raw
    return progress
  })
}

// 카탈로그 키만 노출. 디스에이블 키도 0으로 포함하므로 UI 리스트에는 쓰지 말 것 (passiveCatalog의 getMvpPassiveIds 사용).
export function getAllLevels() {
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

// 다른 클라이언트 빌드가 저장한 미지정 키는 보존한다.
function persist(id, nextLevel) {
  updateRaw((raw) => {
    raw[id] = nextLevel
  })
}

// BASE_PRICES.length >= max(maxLevel) 인바리언트가 깨지지 않는 한 getPriceFor는 null을 반환하지 않으므로 noPrice 가드는 두지 않는다.
export function purchase(id, currentGold) {
  if (!isValidPassiveId(id)) return { ok: false, reason: 'unknownId' }
  const entry = PASSIVE_CATALOG[id]
  if (!entry.enabled) return { ok: false, reason: 'disabled' }
  const currentLevel = getLevel(id)
  const nextLevel = currentLevel + 1
  if (nextLevel > entry.maxLevel) return { ok: false, reason: 'maxLevel' }
  const price = getPriceFor(id, nextLevel)
  if (currentGold < price) return { ok: false, reason: 'insufficient', price }
  persist(id, nextLevel)
  return { ok: true, nextLevel, price, nextGold: currentGold - price }
}

export function resetAllLevels() {
  updateFirebasePlayerProgress((progress) => {
    progress.passiveUpgrades = {}
    return progress
  })
}

// 테스트용. 운영 코드에서는 호출하지 않는다.
export function _resetForTests() {
  _seedHydratedFirebaseProgressForTests()
  resetAllLevels()
}
