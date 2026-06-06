// localStorage 영구 누적 기록 계층.
// passiveUpgrades.js의 forward-compat 패턴을 정확히 mirror한다.
// 카탈로그 키만 노출하되 미지정 키는 디스크에 보존 (다른 클라이언트 빌드 호환).

export const STORAGE_KEY = 'school_survivor:playerRecords'

// 누적 기록 10키. weapon_expansion_unlock_plan_2026-05-10.md §3-2.
export const RECORD_KEYS = [
  'totalRuns',
  'totalKills',
  'totalGold',
  'totalSurvivalSeconds',
  'bestSurvivalSeconds',
  'stage1Clears',
  'stage1Survival180Runs',
  'stage2Clears',
  'stage2BestSurvivalSec',
  'bossKills',
  'totalLevelUps',
  'totalPickups',
  'weaponMasterCount',
]

const RECORD_KEY_SET = new Set(RECORD_KEYS)

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
  for (const k of RECORD_KEYS) {
    out[k] = raw[k] ?? 0
  }
  return out
}

export function getRecord(key) {
  if (!RECORD_KEY_SET.has(key)) return 0
  return readRaw()[key] ?? 0
}

export function incrementRecord(key, amount = 1) {
  if (!RECORD_KEY_SET.has(key)) return
  if (!Number.isFinite(amount) || amount <= 0) return
  const raw = readRaw()
  raw[key] = (raw[key] ?? 0) + Math.floor(amount)
  writeRaw(raw)
}

export function setBestIfHigher(key, value) {
  if (!RECORD_KEY_SET.has(key)) return
  if (!Number.isFinite(value) || value < 0) return
  const raw = readRaw()
  const v = Math.floor(value)
  if (v > (raw[key] ?? 0)) {
    raw[key] = v
    writeRaw(raw)
  }
}

// 본 런 카운터를 누적 키로 합산. U4 _onRunEnd에서 호출.
export function snapshot({ runKills = 0, runGold = 0, runLevelUps = 0, runSurvivalSeconds = 0 } = {}) {
  const raw = readRaw()
  raw.totalRuns = (raw.totalRuns ?? 0) + 1
  raw.totalKills = (raw.totalKills ?? 0) + Math.max(0, Math.floor(runKills))
  raw.totalGold = (raw.totalGold ?? 0) + Math.max(0, Math.floor(runGold))
  raw.totalLevelUps = (raw.totalLevelUps ?? 0) + Math.max(0, Math.floor(runLevelUps))
  raw.totalSurvivalSeconds = (raw.totalSurvivalSeconds ?? 0) + Math.max(0, Math.floor(runSurvivalSeconds))
  writeRaw(raw)
}

// 테스트용.
export function _resetForTests() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
