// Zombie encyclopedia progress layer.
// Encounter persistence lives only in Firebase users/{uid}.progress.encounteredZombieTypes.
import { ENEMY_TYPE_NAMES } from './enemyEntityPool.js'
import { isFirebaseProgressHydrated, readFirebasePlayerProgress, requestCloudProgressSave, updateFirebasePlayerProgress } from './firebaseProgress.js'

export const ZOMBIE_ENCOUNTER_STORAGE_KEY = 'school_survivor:zombieEncounters'

const ZOMBIE_TYPE_LABELS = Object.freeze({
  E01: '초록 좀비',
  E02: '덩치 좀비',
  E03: '달리기 좀비',
  E04: '투척 좀비',
  E05: '돌진 좀비',
  E06: '거대 좀비',
  RZL: '런좀비 리더',
  RZC: '런좀비',
  RZT: '트렌치코트 좀비',
  RZG: '경비 좀비',
  E07: '웃는얼굴 좀비',
  E08: '코인 몬스터',
  B01: '수학 선생님 좀비',
  B02: '보스 좀비 B02',
  B03: '보스 좀비 B03',
  B04: '주방장 좀비',
})

export const ZOMBIE_ENCYCLOPEDIA_TYPES = Object.freeze(
  ENEMY_TYPE_NAMES.filter((type) => type && ZOMBIE_TYPE_LABELS[type]),
)

const ZOMBIE_TYPE_SET = new Set(ZOMBIE_ENCYCLOPEDIA_TYPES)

export function isKnownZombieType(type) {
  return ZOMBIE_TYPE_SET.has(type)
}

export function getZombieTypeLabel(type) {
  return ZOMBIE_TYPE_LABELS[type] ?? type
}

export function normalizeZombieEncounterMap(value) {
  const out = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const type of ZOMBIE_ENCYCLOPEDIA_TYPES) {
    if (value[type] === 1 || value[type] === true) out[type] = 1
  }
  return out
}

export function readEncounteredZombieTypes() {
  if (!isFirebaseProgressHydrated()) return new Set()
  const raw = readFirebasePlayerProgress().encounteredZombieTypes ?? {}
  return new Set(Object.keys(normalizeZombieEncounterMap(raw)))
}

export function buildZombieEncyclopediaEntries() {
  const encountered = readEncounteredZombieTypes()
  return ZOMBIE_ENCYCLOPEDIA_TYPES.map((type) => ({
    type,
    label: getZombieTypeLabel(type),
    encountered: encountered.has(type),
  }))
}

export function recordZombieEncounter(type) {
  if (!isKnownZombieType(type) || !isFirebaseProgressHydrated()) return false
  let changed = false
  updateFirebasePlayerProgress((progress) => {
    const encountered = normalizeZombieEncounterMap(progress.encounteredZombieTypes)
    if (encountered[type] === 1) return progress
    encountered[type] = 1
    progress.encounteredZombieTypes = encountered
    changed = true
    return progress
  })
  if (changed) void requestCloudProgressSave()
  return changed
}
