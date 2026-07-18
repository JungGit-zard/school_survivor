// Firebase runtime memory player record layer.
// Durable storage is users/{uid} in Firebase only; browser storage access is forbidden.
import { _seedHydratedFirebaseProgressForTests, readFirebasePlayerProgress, updateFirebasePlayerProgress } from './firebaseProgress.js'

export const STORAGE_KEY = 'school_survivor:playerRecords'

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
  'stage3Clears',
  'stage3BestSurvivalSec',
  'stage4Clears',
  'stage4BestSurvivalSec',
  'bossKills',
  'totalLevelUps',
  'totalPickups',
  'weaponMasterCount',
]

const RECORD_KEY_SET = new Set(RECORD_KEYS)

function readRaw() {
  return readFirebasePlayerProgress().records ?? {}
}

function updateRaw(mutator) {
  updateFirebasePlayerProgress((progress) => {
    const raw = { ...(progress.records ?? {}) }
    mutator(raw)
    progress.records = raw
    return progress
  })
}

export function load() {
  const raw = readRaw()
  const out = {}
  for (const k of RECORD_KEYS) out[k] = raw[k] ?? 0
  return out
}

export function getRecord(key) {
  if (!RECORD_KEY_SET.has(key)) return 0
  return readRaw()[key] ?? 0
}

export function incrementRecord(key, amount = 1) {
  if (!RECORD_KEY_SET.has(key)) return
  if (!Number.isFinite(amount) || amount <= 0) return
  updateRaw((raw) => {
    raw[key] = (raw[key] ?? 0) + Math.floor(amount)
  })
}

export function setBestIfHigher(key, value) {
  if (!RECORD_KEY_SET.has(key)) return
  if (!Number.isFinite(value) || value < 0) return
  updateRaw((raw) => {
    const v = Math.floor(value)
    if (v > (raw[key] ?? 0)) raw[key] = v
  })
}

export function snapshot({ runKills = 0, runGold = 0, runLevelUps = 0, runSurvivalSeconds = 0 } = {}) {
  updateRaw((raw) => {
    raw.totalRuns = (raw.totalRuns ?? 0) + 1
    raw.totalKills = (raw.totalKills ?? 0) + Math.max(0, Math.floor(runKills))
    raw.totalGold = (raw.totalGold ?? 0) + Math.max(0, Math.floor(runGold))
    raw.totalLevelUps = (raw.totalLevelUps ?? 0) + Math.max(0, Math.floor(runLevelUps))
    raw.totalSurvivalSeconds = (raw.totalSurvivalSeconds ?? 0) + Math.max(0, Math.floor(runSurvivalSeconds))
  })
}

export function _resetForTests() {
  _seedHydratedFirebaseProgressForTests()
  updateFirebasePlayerProgress((progress) => {
    progress.records = Object.fromEntries(RECORD_KEYS.map((key) => [key, 0]))
    return progress
  })
}
