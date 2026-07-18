// Firebase runtime memory weapon unlock layer.
// Starter 무기는 저장하지 않는다 — weaponCatalog.evaluateUnlocks가 항상 unlock으로 반환.
import { isValidWeaponId, isStarter } from './weaponCatalog.js'
import { _seedHydratedFirebaseProgressForTests, readFirebasePlayerProgress, updateFirebasePlayerProgress } from './firebaseProgress.js'

export const STORAGE_KEY = 'school_survivor:weaponUnlocks'

function readRaw() {
  return readFirebasePlayerProgress().weaponUnlocks ?? {}
}

function updateRaw(mutator) {
  updateFirebasePlayerProgress((progress) => {
    const raw = { ...(progress.weaponUnlocks ?? {}) }
    mutator(raw)
    progress.weaponUnlocks = raw
    return progress
  })
}

export function isUnlocked(id) {
  if (!isValidWeaponId(id)) return false
  if (isStarter(id)) return true
  return readRaw()[id] === 1
}

export function setUnlocked(id) {
  if (!isValidWeaponId(id)) return
  if (isStarter(id)) return
  updateRaw((raw) => {
    raw[id] = 1
  })
}

export function getAllUnlocked() {
  const raw = readRaw()
  const out = new Set()
  for (const [id, v] of Object.entries(raw)) {
    if (isValidWeaponId(id) && !isStarter(id) && v === 1) out.add(id)
  }
  return out
}

export function _resetForTests() {
  _seedHydratedFirebaseProgressForTests()
  updateFirebasePlayerProgress((progress) => {
    progress.weaponUnlocks = {}
    return progress
  })
}
