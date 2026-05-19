// localStorage 영구 무기 해금 상태.
// Starter 무기는 저장하지 않는다 — weaponCatalog.evaluateUnlocks가 항상 unlock으로 반환.
// 미지정 무기 ID는 디스크에 보존하되 getAllUnlocked에는 카탈로그 키만 노출.
import { isValidWeaponId, isStarter } from './weaponCatalog.js'

export const STORAGE_KEY = 'school_survivor:weaponUnlocks'

function readRaw() {
  if (typeof localStorage === 'undefined') return {}
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed
  } catch {
    return {}
  }
}

function writeRaw(obj) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

export function isUnlocked(id) {
  if (!isValidWeaponId(id)) return false
  if (isStarter(id)) return true
  return readRaw()[id] === 1
}

export function setUnlocked(id) {
  if (!isValidWeaponId(id)) return
  if (isStarter(id)) return
  const raw = readRaw()
  raw[id] = 1
  writeRaw(raw)
}

// 카탈로그 키 중 unlock된 것만 (starter 제외 — 호출자가 evaluateUnlocks를 통해 starter 처리).
export function getAllUnlocked() {
  const raw = readRaw()
  const out = new Set()
  for (const [id, v] of Object.entries(raw)) {
    if (isValidWeaponId(id) && !isStarter(id) && v === 1) {
      out.add(id)
    }
  }
  return out
}

export function _resetForTests() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
