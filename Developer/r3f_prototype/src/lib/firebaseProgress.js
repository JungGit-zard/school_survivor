import { getFirebaseConfig, isFirebaseAuthConfigured } from './firebaseAuth.js'
import { normalizeBossPassiveUnlocks } from './bossPassiveItems.js'
import { reconcileMissionProgress } from './missionProgress.js'
import { isPlayerAppearance } from './playerAppearance.js'
import { isPlayerOutfitId } from './playerOutfitIds.js'
import {
  WEAPON_UNLOCK_SCHEMA_VERSION,
  mergeLegacyAccountEntitlements,
} from './weaponUnlockMigration.js'
import {
  _resetStageSlotForTests,
  clearStoredStageSlot,
  getLiveStageRunKey,
  getLiveStageSlot,
  hasRunLocks,
  holdRunLock,
  isRunLockHeldHere,
  isStoredSlotFresh,
  listPendingStageResults,
  noteStageResultRejections,
  readPendingStageResult,
  readStoredStageSlot,
  releaseRunLock,
  removeAllStageData,
  removePendingStageResult,
  savePendingStageResult,
  withFreeRunLock,
} from './stageSlot.js'

const DATABASE_URL_KEY = 'VITE_FIREBASE_DATABASE_URL'
const SCHEMA_VERSION = 1

export const PLAYER_DURABLE_STORAGE_KEYS = Object.freeze([
  'school_survivor:goldTotal',
  'school_survivor:playerRecords',
  'school_survivor:weaponUnlocks',
  'school_survivor:weaponPermanentUpgrades',
  'school_survivor:passiveUpgrades',
  'school_survivor:bossPassiveUnlocks',
  'school_survivor:zombieEncounters',
  'school_survivor:userNicknames',
  'school_survivor:titleSettings',
  'school_survivor:lastPlayActivity',
  'school_survivor:progressOwnerUid',
])

const PLAYER_DURABLE_STORAGE_KEY_SET = new Set(PLAYER_DURABLE_STORAGE_KEYS)

const RECORD_KEYS = [
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
  'stage5Clears', 'stage5BestSurvivalSec',
  'stage6Clears', 'stage6BestSurvivalSec',
  'stage7Clears', 'stage7BestSurvivalSec',
  'stage8Clears', 'stage8BestSurvivalSec',
  'stage9Clears', 'stage9BestSurvivalSec',
  'stage10Clears', 'stage10BestSurvivalSec',
  'bossKills',
  'totalLevelUps',
  'totalPickups',
  'weaponMasterCount',
]

// Read-only API projection; these keys never enter progress.records on the wire.
const BOSS_RECORD_KEYS = Array.from({ length: 10 }, (_, i) => `stage${i + 1}BossDefeats`)
const RECORD_KEY_SET = new Set(RECORD_KEYS)

const SUPPORTED_LANGUAGES = new Set(['ko', 'en', 'ja'])
const ZOMBIE_ENCOUNTER_TYPES = new Set(['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'RZL', 'RZC', 'B01', 'B02', 'B03', 'B04', 'RZT', 'RZG', 'E07', 'E08', 'E19', 'E20', 'E21', 'E22', 'E23', 'E24', 'E25', 'E26', 'E27', 'E28', 'E29', 'E30', 'E31', 'E32', 'E33', 'B05', 'B06', 'B07', 'B08', 'B09', 'E34', 'E35', 'E36', 'E37', 'E38', 'E39', 'E40', 'E41', 'E42', 'E43', 'E44', 'E45',
  // 투사체 좀비 E46~E60(1차)·E61~E70(2차, 2026-11-07). database.rules.json encounteredZombieTypes 허용 목록과 같다.
  'E46', 'E47', 'E48', 'E49', 'E50', 'E51', 'E52', 'E53', 'E54', 'E55', 'E56', 'E57', 'E58', 'E59', 'E60', 'E61', 'E62', 'E63', 'E64', 'E65', 'E66', 'E67', 'E68', 'E69', 'E70',
  // 블록 좀비 18종 E71~E88(2026-11-14). database.rules.json 허용 목록과 같다 — 규칙을 먼저 배포한다.
  'E71', 'E72', 'E73', 'E74', 'E75', 'E76', 'E77', 'E78', 'E79', 'E80', 'E81', 'E82', 'E83', 'E84', 'E85', 'E86', 'E87', 'E88',
  // Stage 5 보스 교감 좀비(2026-11-08). 문자열 id라 typeCode 배정과 무관하다.
  'B10',
  // 2차 신규 좀비 18종 E89~E106(2026-11-14, 스테이지마다 3종 + 치프). 추가만 한다 — 이 집합은 절대 줄이지 않는다.
  'E89', 'E90', 'E91', 'E92', 'E93', 'E94', 'E95', 'E96', 'E97', 'E98', 'E99', 'E100', 'E101', 'E102', 'E103', 'E104', 'E105', 'E106'])
const MISSION_PROGRESS_SCHEMA_VERSION = 1
const DEFAULT_MISSION_CATALOG_VERSION = 'missions_2026_08_15_v1'
const MISSION_ID_PATTERN = /^[a-z0-9_]{1,64}$/
const MISSION_CLAIM_ID_PATTERN = /^[a-z0-9_:-]{1,140}$/
const MISSION_COUNTER_KEY_PATTERN = /^[A-Za-z0-9_.-]{1,96}$/
const MAX_MISSION_COUNTER_VALUE = 1000000
const MAX_PINNED_MISSION_IDS = 2

const DEFAULT_TITLE_SETTINGS = Object.freeze({
  // null = 저장된 언어 없음 → 브라우저 언어를 쓴다(lib/i18n.js).
  language: null,
  vibration: true,
  reducedEffects: false,
  hitCameraShake: true,
  unlockAllWeaponsCheat: false,
  unlockAllStagesCheat: false,
})

// 저장은 users/{uid} 전체를 다시 읽고 쓰지 않는다(Terry 2026-11-19: 지난 기록을 다시 쓰지 않는다).
// - 진행도: users/{uid}/progress 한 노드만 트랜잭션으로 바꾼다(바뀐 잎만 병합, 합산 값은 차이만 더한다).
// - 스테이지 결과: 끝날 때 한 번, runLedger/{runKey} 한 줄 추가 + progress 합산 값 증가(+ 보스를 잡았으면
//   ledgerSummary/bossDefeats 1 증가)를 하나의 다중 경로 update로 원자적으로 쓴다. 그 줄이 "이미 기록됨"
//   영수증이라 같은 스테이지가 두 번 들어가지 않는다. 쓰기가 거절되면 기기 칸을 지우지 않고 다음 저장·다음
//   로그인 때 그 한 줄만 다시 확인(읽기 1줄)한 뒤 없을 때만 다시 쓴다(2026-11-21).
//   중복 차단은 서버가 보장한다(Terry 2026-11-21 "중복은 어떤 경우라도 막는다"): database.rules.json에서 이미 있는
//   run 행은 똑같은 값으로만 다시 쓸 수 있고, 결과 쓰기는 progress/resultWrites를 1 올리면서 그 쓰기 전에 없던 행
//   (progress/lastResultKey)을 만들어야만 통과한다. 그래서 같은 스테이지의 두 번째 쓰기(다른 탭, 재시도, SDK 재전송)는
//   행·골드·기록·보스 처치 증가까지 통째로 거절된다.
// - 끝났지만 서버 확인 전인 결과는 기기에 "보내는 중"으로 남는다(stageSlot.js). 새 스테이지가 시작돼도 지워지지
//   않고, 서버가 받았다고 확인한 뒤에만 지운다.
// - 프로필·활동·동의: users/{uid}의 해당 자식만 update로 쓴다.
// checkpointLedger·runLedger의 옛 줄은 읽지도 다시 쓰지도 않는다. 스테이지 해금용 보스 처치 수는
// ledgerSummary(작은 고정 크기 노드)에 있다. 아직 옮기지 않은 옛 계정만 로그인 때 runLedger를 딱 한 번
// 읽어 ledgerSummary를 채우고(compactedBefore > 0 = 옮김 완료 표시), 그 뒤로는 다시 읽지 않는다.
let cloudUser = null
let progressClientPromise = null
let testProgressClient = null
let writeQueue = Promise.resolve()
const pendingSaves = new Map()
let storageGuardInstalled = false
let pendingProgressSaveWarning = null
let persistenceSession = ''
let persistenceBase = null
let purchaseOperations = new Map()
// Boss-defeat counts = ledgerSummary.bossDefeats (+ runLedger rows, only for an account not yet
// migrated), counted once at hydration and bumped by each stage this session records.
let ledgerBossCounts = null
// True once the server's ledgerSummary holds every run row's boss proof (migrated account): stage
// results then bump ledgerSummary/bossDefeats in the same atomic write as their row.
let ledgerSummaryComplete = false
// Run keys known to be on the server: rows read by a one-time migration plus every stage this session
// wrote.
let recordedRunKeys = new Set()
// Stage results folded into memory whose atomic cloud write is not acknowledged yet. Progress
// transactions leave these amounts out so they reach the server exactly once.
let inflightFold = createEmptyContribution()
// Stage results folded into memory whose run row is not on the server yet (runKey -> entry). A
// rejected write stays here (its amounts stay in inflightFold, its device slot stays) and is retried by
// the next progress save; the retry first reads that one row so a write whose ack was lost is never
// applied twice.
let pendingStageRows = new Map()
// Sign-in work that runs after sign-in returns (one-time ledgerSummary migration, then sending results a
// closed tab left on this device). Saves wait for it; sign-in does not.
let deviceRecovery = Promise.resolve()
let lastTopLevelFingerprint = ''

const SUM_RECORD_KEYS = RECORD_KEYS.filter(key => !/best/i.test(key))
const SUM_RECORD_KEY_SET = new Set(SUM_RECORD_KEYS)
const MAX_RECORD_VALUE = 1000000000
const MAX_GOLD_TOTAL = 1000000000
// Plausibility ceilings for one stage. The rules hold no per-run cap (runLedger rows only need
// non-negative numbers), so a stage result is clamped here before it is folded or written.
const STAGE_RESULT_CAPS = Object.freeze({
  totalRuns: 1,
  totalKills: 200000,
  totalGold: 100000,
  totalSurvivalSeconds: 7200,
  bossKills: 50,
  totalLevelUps: 2000,
  totalPickups: 200000,
  weaponMasterCount: 50,
})
const MAX_STAGE_GOLD_SPENT = 100000
const MAX_STAGE_COUNTER_VALUE = 200000
const MAX_STAGE_COUNTER_KEYS = 256
const RUN_KEY_PATTERN = /^[A-Za-z0-9_-]{1,128}$/
const STAGE_ID_PATTERN = /^stage([1-9]|10)$/
const MAX_SAVE_REPEATS = 3
// Terry 2026-11-21: a stage result the server refuses 3 times (per run id, counted across reloads) is
// given up: its device copy goes, the save warning stops and sign-out is no longer held. Only a server
// refusal (PERMISSION_DENIED) counts; an offline write just waits in the SDK and never counts.
const MAX_STAGE_ROW_REJECTS = 3

function createEmptyContribution() {
  return { gold: 0, records: {}, missionCounters: {} }
}

function isMaxMissionCounter(key) {
  return /bestSurvivalSec|survivedAfterSpawnSec/.test(key)
}

function encodeCounterKey(key) {
  return key.replaceAll('.', '%2E')
}

export function isFirebaseRunRecorded(runKey) {
  return recordedRunKeys.has(runKey)
}

function clampInt(value, max) {
  const number = readNonNegativeInt(value)
  return Math.min(number, max)
}

function sanitizeStageResult(result) {
  if (!result || typeof result !== 'object') return null
  const runKey = typeof result.runKey === 'string' ? result.runKey : ''
  if (!RUN_KEY_PATTERN.test(runKey) || !STAGE_ID_PATTERN.test(result.stageId)) return null
  const stageId = result.stageId
  const records = {}
  for (const [key, raw] of Object.entries(result.records ?? {})) {
    if (SUM_RECORD_KEY_SET.has(key)) {
      records[key] = clampInt(raw, STAGE_RESULT_CAPS[key] ?? 1)
    } else if (key === `${stageId}BossDefeats`) {
      records[key] = clampInt(raw, 1)
    }
  }
  records.totalRuns = 1
  const best = {}
  for (const [key, raw] of Object.entries(result.best ?? {})) {
    if (RECORD_KEY_SET.has(key) && /best/i.test(key)) best[key] = clampInt(raw, STAGE_RESULT_CAPS.totalSurvivalSeconds)
  }
  best.bestSurvivalSeconds ??= 0
  const gold = clampInt(result.gold ?? records.totalGold, STAGE_RESULT_CAPS.totalGold)
  records.totalGold = gold
  const missionCounters = {}
  for (const [key, raw] of Object.entries(result.missionCounters ?? {})) {
    if (Object.keys(missionCounters).length >= MAX_STAGE_COUNTER_KEYS) break
    if (!MISSION_COUNTER_KEY_PATTERN.test(key)) continue
    const value = clampInt(raw, MAX_STAGE_COUNTER_VALUE)
    if (value > 0) missionCounters[key] = value
  }
  const at = Number(result.at)
  return {
    runKey,
    stageId,
    at: Number.isFinite(at) && at > 0 ? Math.floor(at) : Date.now(),
    records,
    best,
    gold,
    goldSpent: clampInt(result.goldSpent, MAX_STAGE_GOLD_SPENT),
    missionCounters,
    bossPassiveUnlocks: normalizeBossPassiveUnlocks(result.bossPassiveUnlocks),
    encounteredZombieTypes: normalizeZombieEncounterMap(result.encounteredZombieTypes),
  }
}

// One stage's result, recorded once. Folds into memory now, then writes the run row and the
// additive progress totals in a single atomic multi-path update (no read of the user node).
// Resolves true once the result is durable on the server, false otherwise (it is then retried).
export function commitFirebaseStageResult(result, user = cloudUser, { followSave = true } = {}) {
  ensureHydrated()
  const uid = runtime.uid
  if (readUserId(user) && readUserId(user) !== uid) return Promise.resolve(false)
  const stage = sanitizeStageResult(result)
  if (!stage || recordedRunKeys.has(stage.runKey) || pendingStageRows.has(stage.runKey)) return Promise.resolve(false)
  // The finished result stays on this device until the server confirms it; the live slot is freed for
  // the next stage, and this tab holds the run's lock so no other tab sends it meanwhile.
  // If the pending copy cannot be stored (quota), the live slot is kept as the device copy instead.
  const priorRejects = clampInt(result.rejects, MAX_STAGE_ROW_REJECTS)
  if (savePendingStageResult({ ...stage, uid, ...(priorRejects > 0 ? { rejects: priorRejects } : {}) })) clearStoredStageSlot(uid, stage.runKey)
  holdRunLock(stage.runKey)

  // Totals close to a rule ceiling go through the clamping progress transaction instead, so the
  // atomic increment can never be rejected by a max-value rule.
  const progressBefore = runtime.progress
  const contribution = createEmptyContribution()
  const netGold = stage.gold - stage.goldSpent
  if (progressBefore.goldTotal + Math.max(0, netGold) < MAX_GOLD_TOTAL && progressBefore.goldTotal + netGold >= 0) contribution.gold = netGold
  for (const key of SUM_RECORD_KEYS) {
    const value = stage.records[key] ?? 0
    if (value > 0 && (progressBefore.records[key] ?? 0) + value < MAX_RECORD_VALUE) contribution.records[key] = value
  }
  for (const [key, value] of Object.entries(stage.missionCounters)) {
    if (!isMaxMissionCounter(key) && (progressBefore.missions.counters[key] ?? 0) + value < MAX_MISSION_COUNTER_VALUE) contribution.missionCounters[key] = value
  }

  updateFirebasePlayerProgress(progress => {
    progress.goldTotal = Math.min(MAX_GOLD_TOTAL, Math.max(0, progress.goldTotal + netGold))
    for (const key of SUM_RECORD_KEYS) {
      if (stage.records[key]) progress.records[key] = Math.min(MAX_RECORD_VALUE, (progress.records[key] ?? 0) + stage.records[key])
    }
    for (const [key, value] of Object.entries(stage.best)) progress.records[key] = Math.max(progress.records[key] ?? 0, value)
    for (const [key, value] of Object.entries(stage.missionCounters)) {
      const prior = progress.missions.counters[key] ?? 0
      progress.missions.counters[key] = Math.min(MAX_MISSION_COUNTER_VALUE, isMaxMissionCounter(key) ? Math.max(prior, value) : prior + value)
    }
    progress.missions = reconcileMissionProgress(progress.missions)
    progress.bossPassiveUnlocks = { ...progress.bossPassiveUnlocks, ...stage.bossPassiveUnlocks }
    progress.encounteredZombieTypes = { ...progress.encounteredZombieTypes, ...stage.encounteredZombieTypes }
  })
  // The stage's start is the account's latest play activity; it travels with the result (no write at
  // run start).
  const startedAt = new Date(stage.at).toISOString()
  if (!runtime.activity?.lastStartedAt || runtime.activity.lastStartedAt < startedAt) {
    runtime = { ...runtime, activity: { lastStageId: stage.stageId, lastStartedAt: startedAt } }
  }
  const bossKey = ledgerBossDefeatKey(stage)
  if (bossKey && ledgerBossCounts) ledgerBossCounts[bossKey]++
  addContribution(inflightFold, contribution, 1)

  const entry = {
    uid,
    session: persistenceSession,
    stage,
    contribution,
    bossKey,
    missionCatalogVersion: runtime.progress.missions.catalogVersion,
    verifyRow: false,
    rejects: priorRejects,
    // The first attempt also carries this device's run-end changes and profile/activity (one write).
    full: true,
    writing: null,
    done: false,
  }
  pendingStageRows.set(stage.runKey, entry)
  return writeStageRow(entry).then(async () => {
    // Usually a no-op now. It retries this row at once if the first write was rejected, and carries
    // anything the result write could not (purchases, settings, a refused best record).
    if (followSave) await requestCloudProgressSave({ uid })
    return entry.done
  })
}

// Writes one pending stage row (+ its increments). Shared by the first attempt and every retry; a call
// while an attempt is running joins it. Only a confirmed row clears the device slot.
function writeStageRow(entry) {
  if (entry.writing) return entry.writing
  const { uid, session, stage, contribution } = entry
  let refusedByServer = false
  const attempt = writeQueue.catch(() => {}).then(async () => {
    if (!isFirebaseProgressHydrated({ uid }) || persistenceSession !== session) return false
    const client = await getProgressClient()
    if (typeof client.update !== 'function' || typeof client.increment !== 'function') {
      throw new FirebaseProgressError('Atomic progress updates are required.', 'update-unavailable')
    }
    // A retry: the earlier write may have landed with its acknowledgement lost. Read that one row
    // (never its siblings); if it is there, the increments landed with it and must not be sent again.
    if (entry.verifyRow) {
      if (await isRunRowOnServer(client, uid, stage.runKey)) return true
      if (!isFirebaseProgressHydrated({ uid }) || persistenceSession !== session) return false
    }
    const now = new Date().toISOString()
    const row = { stageId: stage.stageId, records: stage.records, best: stage.best, gold: stage.gold, at: stage.at }
    const values = {
      [`runLedger/${stage.runKey}`]: row,
      'progress/checkpointRevision': client.increment(1),
      // Server-side once-only guard (database.rules.json): resultWrites may only grow together with a
      // run row, named by lastResultKey, that did not exist before this write.
      'progress/resultWrites': client.increment(1),
      'progress/lastResultKey': stage.runKey,
      updatedAt: now,
    }
    if (entry.bossKey && ledgerSummaryComplete) values[`ledgerSummary/bossDefeats/${entry.bossKey}`] = client.increment(1)
    if (contribution.gold) values['progress/goldTotal'] = client.increment(contribution.gold)
    for (const [key, value] of Object.entries(contribution.records)) values[`progress/records/${key}`] = client.increment(value)
    const counters = Object.entries(contribution.missionCounters)
    let missionsTouched = counters.length > 0
    for (const [key, value] of counters) values[`progress/missions/counters/${encodeCounterKey(key)}`] = client.increment(value)
    const full = entry.full
    entry.full = false
    let leaves = []
    let topLevelFingerprint = null
    if (full) {
      leaves = collectRunEndLeaves()
      for (const leaf of leaves) {
        if (!leaf.path) continue
        values[`progress/${leaf.path}`] = leaf.value
        if (leaf.path.startsWith('missions/')) missionsTouched = true
      }
      const topLevel = buildTopLevelFields()
      const topFingerprint = fingerprint(topLevel)
      if (topFingerprint !== lastTopLevelFingerprint) {
        Object.assign(values, topLevel)
        topLevelFingerprint = topFingerprint
      }
    }
    if (missionsTouched) {
      // The missions node must keep its required header for the update to validate.
      values['progress/missions/schemaVersion'] = MISSION_PROGRESS_SCHEMA_VERSION
      values['progress/missions/catalogVersion'] = entry.missionCatalogVersion
      values['progress/missions/updatedAt'] ??= now
    }
    try {
      await client.update(`users/${uid}`, values)
    } catch (error) {
      refusedByServer = isServerRefusal(error)
      throw error
    }
    entry.writtenLeaves = leaves
    entry.writtenTopLevel = topLevelFingerprint
    return true
  }).catch(error => {
    console.warn('Firebase stage result was not acknowledged.', error?.code ?? error?.message ?? 'stage-write-failed')
    return false
  }).then(written => {
    entry.writing = null
    if (persistenceSession !== session || pendingStageRows.get(stage.runKey) !== entry) return false
    if (!written) {
      // Kept for retry: amounts stay out of progress transactions, the device slot stays.
      entry.verifyRow = true
      if (refusedByServer) {
        entry.rejects += 1
        if (entry.rejects >= MAX_STAGE_ROW_REJECTS) {
          giveUpStageRow(entry)
          // Settled: nothing is left to retry for this run.
          return true
        }
        noteStageResultRejections(uid, stage.runKey, entry.rejects)
      }
      return false
    }
    pendingStageRows.delete(stage.runKey)
    recordedRunKeys.add(stage.runKey)
    entry.done = true
    addContribution(inflightFold, contribution, -1)
    // What the server now holds, in this session's local terms.
    const nextBase = cloneProgress(persistenceBase.progress)
    addContribution(nextBase, contribution, 1)
    for (const leaf of entry.writtenLeaves ?? []) leaf.apply?.(nextBase)
    persistenceBase = { ...persistenceBase, progress: nextBase }
    if (entry.writtenTopLevel) lastTopLevelFingerprint = entry.writtenTopLevel
    clearStoredStageSlot(uid, stage.runKey)
    removePendingStageResult(uid, stage.runKey)
    releaseRunLock(stage.runKey)
    return true
  })
  entry.writing = attempt
  writeQueue = attempt
  return attempt
}

function isServerRefusal(error) {
  return /permission[_ ]denied/i.test(String(error?.code ?? '')) || /permission[_ ]denied/i.test(String(error?.message ?? ''))
}

// The server refused this result MAX_STAGE_ROW_REJECTS times: drop it everywhere. Its additive amounts
// leave memory (and inflightFold) so no other write carries them; the device copy is removed. No cloud
// write is made for it.
function giveUpStageRow(entry) {
  const { uid, stage, contribution, bossKey } = entry
  pendingStageRows.delete(stage.runKey)
  addContribution(inflightFold, contribution, -1)
  const progress = cloneProgress(runtime.progress)
  addContribution(progress, contribution, -1)
  runtime = { ...runtime, progress }
  if (bossKey && ledgerBossCounts?.[bossKey] > 0) ledgerBossCounts[bossKey]--
  clearStoredStageSlot(uid, stage.runKey)
  removePendingStageResult(uid, stage.runKey)
  releaseRunLock(stage.runKey)
  if (uid === readUserId(cloudUser)) pendingProgressSaveWarning = null
  console.warn('Firebase stage result was given up after repeated server refusals.', stage.runKey)
}

async function isRunRowOnServer(client, uid, runKey) {
  const found = await client.loadFields(`users/${uid}/runLedger`, [runKey])
  return found?.[runKey] != null
}

async function retryPendingStageRows() {
  if (pendingStageRows.size === 0) return true
  const results = await Promise.all([...pendingStageRows.values()].map(writeStageRow))
  return results.every(Boolean)
}

function addContribution(target, contribution, sign) {
  if (target.goldTotal !== undefined) {
    target.goldTotal += sign * contribution.gold
    for (const [key, value] of Object.entries(contribution.records)) target.records[key] = (target.records[key] ?? 0) + sign * value
    for (const [key, value] of Object.entries(contribution.missionCounters)) target.missions.counters[key] = (target.missions.counters[key] ?? 0) + sign * value
    return
  }
  target.gold += sign * contribution.gold
  for (const [key, value] of Object.entries(contribution.records)) target.records[key] = (target.records[key] ?? 0) + sign * value
  for (const [key, value] of Object.entries(contribution.missionCounters)) target.missionCounters[key] = (target.missionCounters[key] ?? 0) + sign * value
}

function hasInflightFold() {
  return inflightFold.gold !== 0
    || Object.values(inflightFold.records).some(Boolean)
    || Object.values(inflightFold.missionCounters).some(Boolean)
}

// Leaves this device changed that are safe as plain values in a multi-path update: flags that only
// turn on, best records that only grow, and mission entries. Purchases, settings and mission claims are
// not here; they keep their own transaction.
function collectRunEndLeaves() {
  const current = runtime.progress
  const base = persistenceBase.progress
  const leaves = []
  for (const key of RECORD_KEYS) {
    if (!/best/i.test(key)) continue
    const value = current.records[key] ?? 0
    if (value > (base.records[key] ?? 0)) leaves.push({ path: `records/${key}`, value, apply: next => { next.records[key] = value } })
  }
  for (const field of ['weaponUnlocks', 'outfitUnlocks', 'encounteredZombieTypes']) {
    for (const [id, value] of Object.entries(current[field] ?? {})) {
      if (value === 1 && base[field]?.[id] !== 1) leaves.push({ path: `${field}/${id}`, value: 1, apply: next => { next[field] = { ...next[field], [id]: 1 } } })
    }
  }
  for (const [id, value] of Object.entries(current.bossPassiveUnlocks ?? {})) {
    if (value === true && base.bossPassiveUnlocks?.[id] !== true) leaves.push({ path: `bossPassiveUnlocks/${id}`, value: true, apply: next => { next.bossPassiveUnlocks = { ...next.bossPassiveUnlocks, [id]: true } } })
  }
  const missions = current.missions
  const baseMissions = base.missions
  for (const [key, value] of Object.entries(missions.counters)) {
    if (isMaxMissionCounter(key) && value > (baseMissions.counters[key] ?? 0)) {
      leaves.push({ path: `missions/counters/${encodeCounterKey(key)}`, value, apply: next => { next.missions.counters[key] = value } })
    }
  }
  for (const [id, entry] of Object.entries(missions.active)) {
    const before = baseMissions.active[id]
    if (fingerprint(entry) === fingerprint(before)) continue
    leaves.push({ path: `missions/active/${id}/counter`, value: entry.counter })
    leaves.push({ path: `missions/active/${id}/target`, value: entry.target })
    if (entry.completedAt && entry.completedAt !== before?.completedAt) leaves.push({ path: `missions/active/${id}/completedAt`, value: entry.completedAt })
    // claimedAt/claimId are never written here (the claim transaction owns them).
    leaves.push({ path: null, apply: next => {
      const prior = next.missions.active[id] ?? { claimedAt: null, claimId: null }
      next.missions.active[id] = { ...prior, counter: entry.counter, target: entry.target, completedAt: entry.completedAt ?? prior.completedAt ?? null }
    } })
  }
  for (const [id, entry] of Object.entries(missions.completed)) {
    if (fingerprint(entry) === fingerprint(baseMissions.completed[id])) continue
    leaves.push({ path: `missions/completed/${id}`, value: { ...entry }, apply: next => { next.missions.completed[id] = { ...entry } } })
  }
  if (missions.updatedAt && missions.updatedAt !== baseMissions.updatedAt) {
    const value = missions.updatedAt
    leaves.push({ path: 'missions/updatedAt', value, apply: next => { next.missions.updatedAt = value } })
  }
  return leaves
}

// Results left on this device by a closed tab — its live slot, or finished results the server never
// confirmed: each is sent once, unless its run row is already on the server (one row read; then the
// device copy is just removed). A result still owned by an open tab (it holds the run's Web Lock or,
// without Web Locks, its slot heartbeat is fresh) is left alone. The server rule rejects a second copy
// anyway; the lock keeps a live tab's stage from being cut short by another tab.
async function recoverDeviceStageResults(uid) {
  const candidates = []
  const slot = readStoredStageSlot(uid)
  if (slot && slot.runKey !== getLiveStageRunKey() && !pendingStageRows.has(slot.runKey)) {
    if (hasRunLocks() || !isStoredSlotFresh(slot)) candidates.push({ runKey: slot.runKey, fromSlot: true })
  }
  for (const pending of listPendingStageResults(uid)) {
    if (pending.runKey === getLiveStageRunKey() || pendingStageRows.has(pending.runKey)) continue
    if (!hasRunLocks() && pending.fromLive && isStoredSlotFresh(pending)) continue
    candidates.push({ runKey: pending.runKey, fromSlot: false })
  }
  for (const { runKey, fromSlot } of candidates) {
    if (!isFirebaseProgressHydrated({ uid })) return
    // This tab's own earlier stage (e.g. it ended before this account was hydrated): it already holds the
    // lock. Any other tab's: only when that tab is gone.
    const underLock = isRunLockHeldHere(runKey) ? task => task() : task => withFreeRunLock(runKey, task)
    await underLock(async () => {
      // Read again under the lock: another tab may have finished it meanwhile.
      const stored = fromSlot ? readStoredStageSlot(uid) : readPendingStageResult(uid, runKey)
      if (!stored || stored.runKey !== runKey || !isFirebaseProgressHydrated({ uid })) return
      const forget = () => {
        clearStoredStageSlot(uid, runKey)
        removePendingStageResult(uid, runKey)
      }
      if (recordedRunKeys.has(runKey)) return forget()
      let onServer
      try {
        const client = await getProgressClient()
        onServer = await isRunRowOnServer(client, uid, runKey)
      } catch (error) {
        // Unknown: keep the device copy for the next sign-in rather than risk a second copy.
        console.warn('Firebase stage row check failed.', error?.code ?? error?.message ?? 'row-check-failed')
        return
      }
      if (!isFirebaseProgressHydrated({ uid })) return
      if (onServer) {
        recordedRunKeys.add(runKey)
        return forget()
      }
      await commitFirebaseStageResult(stored, { uid }, { followSave: false })
    })
  }
}

export function recordFirebaseProgressPurchase({ category, id, price, nextLevel }) {
  ensureHydrated()
  if (!['passiveUpgrades','weaponPermanentUpgrades'].includes(category) || !Number.isFinite(price) || price < 0) return false
  const operationId = globalThis.crypto?.randomUUID?.() ?? `purchase-${Date.now()}-${Math.random().toString(36).slice(2)}`
  purchaseOperations.set(operationId, { category, id, price, fromLevel: nextLevel - 1, nextLevel, refundApplied: false })
  return true
}

const VITEST_PROGRESS_CLIENT = Object.freeze({
  load: async () => null,
  loadFields: async () => null,
  save: async () => true,
  update: async () => true,
  increment: (delta) => ({ '.sv': { increment: delta } }),
  remove: async () => true,
  transaction: async () => ({ committed: false, snapshot: null }),
})

let runtime = createEmptyRuntime()

export class FirebaseProgressError extends Error {
  constructor(message, code = 'firebase-progress-error') {
    super(message)
    this.name = 'FirebaseProgressError'
    this.code = code
  }
}

export function isFirebaseProgressConfigured(env = getDefaultEnv()) {
  return isFirebaseAuthConfigured(env) && readEnv(env, DATABASE_URL_KEY).length > 0
}

export function getUserProgressPath(user = cloudUser) {
  const uid = readUserId(user)
  return uid ? `users/${uid}` : ''
}

function resetSessionState() {
  purchaseOperations = new Map()
  ledgerBossCounts = null
  ledgerSummaryComplete = false
  recordedRunKeys = new Set()
  inflightFold = createEmptyContribution()
  pendingStageRows = new Map()
  deviceRecovery = Promise.resolve()
  lastTopLevelFingerprint = ''
}

export function setCloudProgressUser(user) {
  const nextUid = readUserId(user)
  const currentUid = readUserId(cloudUser)
  cloudUser = user ?? null
  if (!nextUid || nextUid !== currentUid) {
    pendingProgressSaveWarning = null
    resetSessionState()
    runtime = createEmptyRuntime(nextUid)
  }
}

export function isFirebaseProgressHydrated(user = cloudUser) {
  const uid = readUserId(user)
  return !!uid && runtime.uid === uid && runtime.hydrated === true && runtime.remoteHydrated === true
}

export function getFirebaseProgressRuntimeSnapshot() {
  return cloneRuntime(runtime)
}

// Cheap read of one primitive progress leaf (no clone). For per-frame/per-hit callers.
export function peekFirebaseProgress(field, key) {
  if (!isRuntimeHydrated()) return undefined
  return runtime.progress[field]?.[key]
}

export function buildCloudUserProfile(user = cloudUser) {
  ensureHydrated()
  const uid = readUserId(user) || runtime.uid
  if (!uid) return null
  return {
    uid,
    displayName: readString(user?.displayName ?? runtime.profile.displayName),
    nickname: readString(runtime.profile.nickname),
  }
}

export function buildCloudProgressSnapshot(now = Date.now()) {
  ensureHydrated()
  return { ...buildTopLevelPayload(now), schemaVersion: SCHEMA_VERSION, progress: serializeProgress(runtime.progress) }
}

// Only what the game needs. checkpointLedger (old per-page copies) and runLedger (run history) are
// never fetched; runLedger is read once only to migrate an account whose ledgerSummary is incomplete.
const HYDRATION_FIELDS = Object.freeze(['schemaVersion', 'profile', 'progress', 'activity', 'consent', 'ledgerSummary'])

async function loadHydrationSnapshot(client, path) {
  if (typeof client.loadFields !== 'function') throw new FirebaseProgressError('Named-child progress reads are required.', 'load-fields-unavailable')
  const fields = await client.loadFields(path, HYDRATION_FIELDS)
  if (!fields || typeof fields !== 'object' || fields.progress == null) return null
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined && value !== null))
}

// One-time migration read (account not migrated yet): every row's boss proof goes into ledgerSummary.
async function loadRunLedgerForMigration(client, path) {
  const rows = await client.loadFields(path, ['runLedger'])
  return rows?.runLedger && typeof rows.runLedger === 'object' ? rows.runLedger : {}
}

function isLedgerSummaryComplete(value) {
  return Number.isSafeInteger(value?.compactedBefore) && value.compactedBefore > 0
}

// Writes the counted boss proof as a complete ledgerSummary, once per account. A failure is harmless:
// this session keeps the counts in memory and the next sign-in migrates again.
function migrateLedgerSummary(client, uid, path, snapshot) {
  if (ledgerSummaryComplete || !ledgerBossCounts) return Promise.resolve(false)
  const session = persistenceSession
  const priorRuns = Number.isSafeInteger(snapshot?.ledgerSummary?.runs) && snapshot.ledgerSummary.runs > 0 ? snapshot.ledgerSummary.runs : 0
  const rowCount = snapshot?.runLedger && typeof snapshot.runLedger === 'object' ? Object.keys(snapshot.runLedger).length : 0
  // Nothing to migrate (no run rows, no prior summary): write nothing. Reading an empty runLedger at the
  // next sign-in costs nothing, and the first row that appears is migrated then.
  if (rowCount === 0 && priorRuns === 0 && BOSS_RECORD_KEYS.every(key => !(ledgerBossCounts[key] > 0))) return Promise.resolve(false)
  const summary = {
    compactedBefore: Date.now(),
    runs: priorRuns + rowCount,
    // All ten keys, zeros included, so a stage result can always increment its key.
    bossDefeats: Object.fromEntries(BOSS_RECORD_KEYS.map(key => [key, ledgerBossCounts[key] ?? 0])),
  }
  const attempt = writeQueue.catch(() => {}).then(async () => {
    if (!isFirebaseProgressHydrated({ uid }) || persistenceSession !== session) return false
    if (typeof client.update !== 'function') return false
    // Multi-path update of the small ledgerSummary node only (path = users/{uid}).
    await client.update(path, { ledgerSummary: summary, updatedAt: new Date().toISOString() })
    if (persistenceSession !== session) return false
    ledgerSummaryComplete = true
    return true
  }).catch(error => {
    console.warn('Firebase ledger summary migration was not acknowledged.', error?.code ?? error?.message ?? 'migration-failed')
    return false
  })
  writeQueue = attempt
  return attempt
}

export async function hydrateCloudProgress(user = cloudUser) {
  setCloudProgressUser(user)
  const runtimeAtRequest = runtime
  const requestedUid = readUserId(user)
  const path = getUserProgressPath(user)
  if (!path) throw new FirebaseProgressError('Firebase progress hydrate requires an authenticated uid.', 'unauthenticated')
  if (!isFirebaseProgressConfigured()) throw new FirebaseProgressError('Firebase progress is not configured.', 'unconfigured')

  try {
    const client = await getProgressClient()
    const snapshot = await loadHydrationSnapshot(client, path)
    if (readUserId(cloudUser) !== requestedUid) return false
    // A live account may already hold unsent edits; only a fresh runtime takes a remote snapshot.
    if (runtimeAtRequest.remoteHydrated && isFirebaseProgressHydrated(user)) return true
    // A same-account refresh must not roll back progress earned while its read was in flight.
    if (runtime !== runtimeAtRequest && isFirebaseProgressHydrated(user)) return true
    if (!snapshot) {
      runtime = createEmptyRuntime(requestedUid)
      throw new FirebaseProgressError(`Remote Firebase user snapshot is missing at ${path}.`, 'missing-remote')
    }
    if (!isLedgerSummaryComplete(snapshot.ledgerSummary)) {
      snapshot.runLedger = await loadRunLedgerForMigration(client, path)
      if (readUserId(cloudUser) !== requestedUid) return false
      if (runtime !== runtimeAtRequest && isFirebaseProgressHydrated(user)) return true
    }
    if (!applyCloudProgressSnapshot(snapshot, user)) {
      runtime = createEmptyRuntime(requestedUid)
      throw new FirebaseProgressError(`Remote Firebase user snapshot is invalid at ${path}.`, 'invalid-remote')
    }
    // Sign-in returns now; the one-time migration write and the device results follow in the background
    // (in that order, so a recovered boss proof lands in a complete ledgerSummary). Saves wait for them.
    const migrating = snapshot.runLedger ? migrateLedgerSummary(client, requestedUid, path, snapshot) : Promise.resolve(false)
    deviceRecovery = migrating.then(() => recoverDeviceStageResults(requestedUid)).catch(error => {
      console.warn('Device stage results were not recovered.', error?.message ?? 'recovery-failed')
    })
    if (migrateLegacyWeaponUnlockEntitlements()) {
      // 이전 저장 실패는 플레이와 현재 세션의 권리 적용을 막지 않는다. 다음 정상 저장 때 다시 시도된다.
      // 기기에 남은 결과 처리(deviceRecovery)는 기다리지 않는다(2026-11-21: 로그인이 남은 결과 쓰기에 묶이지 않는다).
      await performCloudProgressSave(user)
    }
    return true
  } catch (error) {
    if (readUserId(cloudUser) !== requestedUid) return false
    if (runtime !== runtimeAtRequest && isFirebaseProgressHydrated(user)) return true
    if (!(error instanceof FirebaseProgressError)) {
      runtime = createEmptyRuntime()
    }
    throw error
  }
}

export async function loadCloudProgressFromCloud(user = cloudUser) {
  return hydrateCloudProgress(user)
}

export async function saveLocalProgressToCloud(user = cloudUser) {
  return requestCloudProgressSave(user)
}

// Keep authentication alive until every earlier write and the latest progress are saved.
// Bounded: a player still changing progress while signing out gets a warning, not a hang.
export async function flushCloudProgressBeforeSignOut(user = cloudUser) {
  if (!isFirebaseProgressHydrated(user)) return !readUserId(user)
  for (let attempt = 0; attempt < MAX_SAVE_REPEATS; attempt++) {
    const runtimeAtSave = runtime
    if (!await requestCloudProgressSave(user)) return false
    if (!isFirebaseProgressHydrated(user)) return false
    if (runtime === runtimeAtSave && !hasInflightFold()) return true
  }
  markProgressSaveWarning(readUserId(user))
  return false
}

// E2E의 메모리 전용 진행도를 hydrated 상태로 만들되, 가짜 uid를 Firebase 쓰기 대상으로
// 등록하지 않는다. 기본값은 일반 Firebase 로그인 경로의 기존 동작을 그대로 보존한다.
export function applyCloudProgressSnapshot(snapshot, user = cloudUser, { keepCloudUserNull = false } = {}) {
  const uid = readUserId(user)
  if (!uid) return false
  const normalized = normalizeRemoteSnapshot(snapshot, uid, user)
  if (!normalized) return false
  persistenceSession = globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
  persistenceBase = { progress: cloneProgress(normalized.progress) }
  resetSessionState()
  // Boss proof for stage unlocks lives in ledgerSummary. Run rows (present only for a one-time
  // migration) are counted, never kept, unless the summary already includes them.
  const summary = normalizeLedgerSummary(snapshot?.ledgerSummary)
  ledgerSummaryComplete = isLedgerSummaryComplete(snapshot?.ledgerSummary)
  const counts = Object.fromEntries(BOSS_RECORD_KEYS.map(key => [key, summary?.bossDefeats?.[key] ?? 0]))
  const rows = snapshot?.runLedger && typeof snapshot.runLedger === 'object' ? snapshot.runLedger : {}
  for (const [runKey, row] of Object.entries(rows)) {
    recordedRunKeys.add(runKey)
    const key = ledgerSummaryComplete ? null : ledgerBossDefeatKey(row)
    if (key) counts[key]++
  }
  ledgerBossCounts = counts
  cloudUser = keepCloudUserNull ? null : (user ?? cloudUser)
  runtime = {
    uid,
    hydrated: true,
    remoteHydrated: true,
    profile: normalized.profile,
    progress: normalized.progress,
    activity: normalized.activity,
    consent: normalized.consent,
  }
  lastTopLevelFingerprint = fingerprint(buildTopLevelFields())
  return true
}

function normalizeLedgerSummary(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const bossDefeats = {}
  for (const key of BOSS_RECORD_KEYS) {
    const count = value.bossDefeats?.[key]
    if (Number.isSafeInteger(count) && count > 0) bossDefeats[key] = count
  }
  return { bossDefeats }
}

export function updateFirebasePlayerProgress(mutator) {
  ensureHydrated()
  const next = cloneProgress(runtime.progress)
  const result = mutator(next)
  runtime = {
    ...runtime,
    progress: normalizeProgress(result && typeof result === 'object' ? result : next),
  }
  return getFirebaseProgressRuntimeSnapshot().progress
}

export function updateFirebasePlayerProfile(mutator) {
  ensureHydrated()
  const next = { ...runtime.profile }
  const result = mutator(next)
  runtime = {
    ...runtime,
    profile: normalizeProfile(result && typeof result === 'object' ? result : next, runtime.uid),
  }
  return { ...runtime.profile }
}

// Render-time read boundary. Guests and pre-hydration screens (shop, encyclopedia,
// results) get a zero-value progress copy instead of a throw. It is a detached clone:
// writes still go through updateFirebasePlayerProgress, which stays strict so
// un-hydrated defaults can never overwrite the remote snapshot.
export function readFirebasePlayerProgressOrDefault() {
  if (!isRuntimeHydrated()) return createEmptyProgress()
  return readFirebasePlayerProgress()
}

// The boss-defeat record key one ledger row counts toward, or null.
function ledgerBossDefeatKey(run) {
  if (typeof run?.stageId !== 'string' || !/^stage([1-9]|10)$/.test(run.stageId)) return null
  const key = `${run.stageId}BossDefeats`
  const value = Object.hasOwn(run.records ?? {}, key) ? run.records[key] : run.records?.bossKills
  return Number.isSafeInteger(value) && value >= 1 ? key : null
}

export function readFirebasePlayerProgress() {
  ensureHydrated()
  const progress = cloneProgress(runtime.progress)
  const counts = ledgerBossCounts ?? {}
  // A boss beaten in the stage still being played unlocks at once; the stage end records it.
  const live = getLiveStageSlot()
  const liveKey = live && live.uid === runtime.uid ? ledgerBossDefeatKey(live) : null
  for (const key of BOSS_RECORD_KEYS) progress.records[key] = Math.max(progress.records[key] ?? 0, (counts[key] ?? 0) + (key === liveKey ? 1 : 0))
  return progress
}

export function readFirebaseMissionProgress() {
  if (!runtime.hydrated || !runtime.remoteHydrated || !runtime.uid || !runtime.progress) {
    return { ok: false, reason: 'progress-not-hydrated', missions: createEmptyMissionProgress() }
  }
  return { ok: true, missions: cloneMissionProgress(runtime.progress.missions) }
}

export function updateFirebaseMissionProgress(mutator) {
  if (!runtime.hydrated || !runtime.remoteHydrated || !runtime.uid || !runtime.progress) {
    return { ok: false, reason: 'progress-not-hydrated', missions: createEmptyMissionProgress() }
  }
  if (typeof mutator !== 'function') {
    return { ok: false, reason: 'invalid-mutator', missions: cloneMissionProgress(runtime.progress.missions) }
  }
  const next = cloneMissionProgress(runtime.progress.missions)
  const result = mutator(next)
  const missions = normalizeMissionProgress(result && typeof result === 'object' ? result : next)
  runtime = {
    ...runtime,
    progress: normalizeProgress({ ...runtime.progress, missions }),
  }
  return { ok: true, missions: cloneMissionProgress(runtime.progress.missions) }
}

export async function saveFirebaseMissionProgress(user = cloudUser) {
  try {
    const saved = await requestCloudProgressSave(user)
    return { ok: saved === true, saved: saved === true, reason: saved === true ? 'saved' : 'not-ready' }
  } catch (error) {
    return { ok: false, saved: false, reason: readErrorCode(error, 'save-failed') }
  }
}

export async function claimFirebaseMissionReward({
  user = cloudUser,
  missionId,
  catalogVersion,
  rewardAllowlist,
  completion,
} = {}) {
  const uid = readUserId(user)
  const safeMissionId = normalizeMissionId(missionId)
  const safeCatalogVersion = readMissionCatalogVersion(catalogVersion || runtime.progress?.missions?.catalogVersion)
  const reward = readAllowedMissionReward(rewardAllowlist, safeMissionId)
  if (!uid) return { ok: false, committed: false, reason: 'unauthenticated' }
  if (!safeMissionId) return { ok: false, committed: false, reason: 'invalid-mission-id' }
  if (!reward) return { ok: false, committed: false, reason: 'invalid-reward-allowlist' }
  if (!isFirebaseProgressHydrated(user)) return { ok: false, committed: false, reason: 'progress-not-hydrated' }
  if (!isFirebaseProgressConfigured()) return { ok: false, committed: false, reason: 'unconfigured' }

  if (!await requestCloudProgressSave(user)) return { ok: false, committed: false, reason: 'save-failed' }

  const claimId = `${safeMissionId}:${safeCatalogVersion}`
  if (!MISSION_CLAIM_ID_PATTERN.test(claimId)) return { ok: false, committed: false, reason: 'invalid-claim-id' }

  const attempt = writeQueue.catch(() => {}).then(async () => {
    if (!isFirebaseProgressHydrated(user)) return { ok: false, committed: false, reason: 'account-changed' }
    const sessionAtClaim = persistenceSession
    const progressAtClaim = cloneProgress(runtime.progress)
    const client = await getProgressClient()
    if (!isFirebaseProgressHydrated(user) || persistenceSession !== sessionAtClaim) return { ok: false, committed: false, reason: 'account-changed' }
    if (typeof client.transaction !== 'function') {
      return { ok: false, committed: false, reason: 'transaction-unavailable', claimId }
    }

    let blockedReason = 'transaction-aborted'
    const transactionResult = await client.transaction(`users/${uid}/progress`, (progress) => {
      const nextProgress = normalizeProgress(progress && typeof progress === 'object' ? progress : runtime.progress)
      const missions = cloneMissionProgress(nextProgress.missions)
      const activeEntry = missions.active[safeMissionId]
      const completedEntry = missions.completed[safeMissionId]
      const claimedEntry = missions.claimed[safeMissionId]
      const ledgerEntry = missions.claimLedger[claimId]
      const now = new Date().toISOString()
      // 완료의 정본은 서버 카운터다. 런 체크포인트는 카운터만 올리고 completedAt은 런 종료
      // saveMissionProgress가 성공할 때만 올라가므로, 카운터 충족만으로도 claim을 허용한다.
      const counterStatus = readMissionCounterCompletion(missions.counters, completion)
      const completedAt = readNullableIsoString(activeEntry?.completedAt)
        || readNullableIsoString(completedEntry?.completedAt)
        || (counterStatus?.complete ? now : null)

      if (ledgerEntry || activeEntry?.claimedAt || claimedEntry?.claimedAt) {
        blockedReason = 'already-claimed'
        return undefined
      }
      if (!completedAt) {
        blockedReason = 'not-completed'
        return undefined
      }

      const nextActiveEntry = normalizeMissionEntry({
        ...(counterStatus ? { counter: counterStatus.counter, target: counterStatus.target } : null),
        ...activeEntry,
        completedAt,
        claimedAt: now,
        claimId,
      })
      const claimedRecord = {
        claimedAt: now,
        claimId,
        catalogVersion: safeCatalogVersion,
        reward,
      }
      const ledgerRecord = {
        missionId: safeMissionId,
        catalogVersion: safeCatalogVersion,
        claimedAt: now,
        reward,
      }

      missions.active[safeMissionId] = nextActiveEntry
      missions.completed[safeMissionId] = normalizeMissionCompletedEntry({
        ...completedEntry,
        completedAt,
        counter: nextActiveEntry.counter,
        target: nextActiveEntry.target,
      })
      missions.claimed[safeMissionId] = normalizeMissionClaimedEntry(claimedRecord)
      missions.claimLedger[claimId] = normalizeMissionClaimLedgerEntry(ledgerRecord, safeMissionId, safeCatalogVersion)
      missions.updatedAt = now
      missions.catalogVersion = safeCatalogVersion

      nextProgress.goldTotal = readNonNegativeInt(nextProgress.goldTotal) + reward.amount
      nextProgress.missions = normalizeMissionProgress(missions)
      blockedReason = 'claimed'
      return { ...progress, ...serializeProgress(nextProgress), checkpointRevision: (progress?.checkpointRevision ?? 0) + 1 }
    })

    const snapshotValue = readTransactionSnapshotValue(transactionResult?.snapshot)
    if (!isFirebaseProgressHydrated(user) || persistenceSession !== sessionAtClaim) return { ok: false, committed: false, reason: 'account-changed' }
    if (snapshotValue && typeof snapshotValue === 'object') {
      const server = normalizeProgress(snapshotValue)
      // The server reward is already durable. Rebase it rather than charging it
      // again as this session's local gold delta, and retain in-flight pickups.
      persistenceBase.progress.goldTotal += server.goldTotal - progressAtClaim.goldTotal
      for (const key of RECORD_KEYS) persistenceBase.progress.records[key] += server.records[key] - progressAtClaim.records[key]
      const progressDuringClaim = cloneProgress(runtime.progress)
      const mergedProgress = normalizeProgress(mergeChangedProgress(server, progressAtClaim, progressDuringClaim))
      mergedProgress.goldTotal = server.goldTotal + progressDuringClaim.goldTotal - progressAtClaim.goldTotal
      for (const key of RECORD_KEYS) mergedProgress.records[key] = /best/i.test(key)
        ? Math.max(server.records[key],progressDuringClaim.records[key])
        : server.records[key] + progressDuringClaim.records[key] - progressAtClaim.records[key]
      for(const key of new Set([...Object.keys(server.missions.counters),...Object.keys(progressDuringClaim.missions.counters)])) {
        const before=progressAtClaim.missions.counters[key]??0
        const remote=server.missions.counters[key]??0
        persistenceBase.progress.missions.counters[key]=(persistenceBase.progress.missions.counters[key]??0)+remote-before
        mergedProgress.missions.counters[key]=/bestSurvivalSec|survivedAfterSpawnSec/.test(key)
          ? Math.max(remote,progressDuringClaim.missions.counters[key]??0)
          : remote+(progressDuringClaim.missions.counters[key]??0)-before
      }
      mergedProgress.missions=reconcileMissionProgress(mergedProgress.missions)
      runtime = {
        ...runtime,
        progress: mergedProgress,
      }
    }

    const ok = transactionResult?.committed === true && blockedReason === 'claimed'
    return {
      ok,
      committed: transactionResult?.committed === true,
      reason: ok ? 'claimed' : blockedReason,
      claimId,
      missions: runtime.progress ? cloneMissionProgress(runtime.progress.missions) : createEmptyMissionProgress(),
      goldTotal: runtime.progress ? runtime.progress.goldTotal : 0,
    }
  }).catch((error) => ({ ok: false, committed: false, reason: readErrorCode(error, 'claim-failed'), claimId }))
  writeQueue = attempt
  return attempt
}

// 약관/개인정보 동의 기록은 users/{uid}.consent — profile·progress 안이 아니라 activity와
// 같은 최상위 형제 노드다. normalizeProfile/normalizeProgress가 화이트리스트 밖 키를 버리기
// 때문에 그 안에는 애초에 실을 수 없고, 보안 규칙도 노드별로 검증하므로 정체성 성격의
// 동의 기록을 독립 노드로 두는 편이 규칙 단위와 1:1로 맞는다.
export function readFirebasePlayerConsent() {
  ensureHydrated()
  return cloneConsent(runtime.consent)
}

// null을 넘기면 기록을 비운다(저장 실패 롤백 경로에서 사용).
export function writeFirebasePlayerConsent(consent) {
  ensureHydrated()
  runtime = { ...runtime, consent: normalizeConsent(consent) }
  return cloneConsent(runtime.consent)
}

// 계정 삭제 경로 전용. users/{uid} 문서 전체를 제거한다.
// Realtime Database의 remove는 노드가 이미 없어도 성공하므로 재시도가 멱등적이다.
export async function deleteFirebaseProgressDocument(user = cloudUser) {
  const path = getUserProgressPath(user)
  if (!path) throw new FirebaseProgressError('Firebase progress delete requires an authenticated uid.', 'unauthenticated')
  const client = await getProgressClient()
  // 런타임을 먼저 비워 대기 중인 저장 큐가 삭제 직후 문서를 되살리지 못하게 한다.
  // 이미 실행 중인 저장은 큐를 흘려보낸 뒤 삭제한다.
  runtime = createEmptyRuntime()
  cloudUser = null
  removeAllStageData(readUserId(user))
  await writeQueue.catch(() => {})
  await client.remove(path)
  return true
}

export function recordPlayActivity(stageId, now = Date.now()) {
  ensureHydrated()
  if (typeof stageId !== 'string' || stageId.trim().length === 0) return false
  const startedAt = new Date(now)
  if (Number.isNaN(startedAt.getTime())) return false
  runtime = {
    ...runtime,
    activity: {
      lastStageId: stageId.trim(),
      lastStartedAt: startedAt.toISOString(),
    },
  }
  // Memory only: nothing is uploaded during play. It goes out with the stage result.
  return true
}

// writeQueue는 쓰기 순서를 직렬화하는 용도일 뿐이며, 절대 rejected 상태로 남으면 안 된다.
// rejected promise에 .then(handler)를 걸면 handler가 아예 실행되지 않으므로, 저장이 한 번
// 실패한 순간부터 그 세션의 모든 코인·업그레이드 저장이 조용히 건너뛰어진다(오프라인 한 번에
// 이후 진행도 전부 유실). 실패는 큐에서 흡수하고 호출자에게는 false로 알린다.
export function requestCloudProgressSave(user = cloudUser) {
  const key = `${readUserId(user)}:${persistenceSession}`
  if (pendingSaves.has(key)) return pendingSaves.get(key)
  const recovery = deviceRecovery
  const pending = recovery.then(() => performCloudProgressSave(user)).finally(() => {
    if (pendingSaves.get(key) === pending) pendingSaves.delete(key)
  })
  pendingSaves.set(key,pending)
  return pending
}

async function performCloudProgressSave(user, repeat = 0) {
  const uidAtRequest = readUserId(user)
  let runtimeAtSave
  if (!isFirebaseProgressHydrated(user) || !isFirebaseProgressConfigured()) {
    markProgressSaveWarning(uidAtRequest)
    return false
  }
  // Stage rows whose earlier write was rejected go first (each one at most once on the server).
  const rowsWritten = await retryPendingStageRows()
  const attempt = writeQueue.catch(() => {}).then(async () => {
    if (!isFirebaseProgressHydrated({ uid: uidAtRequest })) {
      return { saved: false, shouldWarn: false }
    }
    runtimeAtSave = runtime
    const session = persistenceSession
    const progressAtSave = cloneProgress(runtime.progress)
    const payload = serializeProgress(progressAtSave)
    const base = serializeProgress(persistenceBase.progress)
    const inflightAtSave = structuredClone(inflightFold)
    const purchasesAtSave = [...purchaseOperations.entries()]
    const topLevel = buildTopLevelFields()
    const topLevelFingerprint = fingerprint(topLevel)
    const delta = {
      gold: payload.goldTotal - base.goldTotal - inflightAtSave.gold,
      records: Object.fromEntries(SUM_RECORD_KEYS.map(key => [key, payload.records[key] - base.records[key] - (inflightAtSave.records[key] ?? 0)])),
      missionCounters: Object.fromEntries(Object.entries(payload.missions.counters).map(([key, value]) => [key,
        value - (base.missions.counters[key] ?? 0) - (inflightAtSave.missionCounters[key.replaceAll('%2E', '.')] ?? 0)])),
    }
    const expected = structuredClone(base)
    expected.goldTotal += inflightAtSave.gold
    for (const [key, value] of Object.entries(inflightAtSave.records)) expected.records[key] += value
    for (const [key, value] of Object.entries(inflightAtSave.missionCounters)) {
      const wireKey = encodeCounterKey(key)
      expected.missions.counters[wireKey] = (expected.missions.counters[wireKey] ?? 0) + value
    }
    const progressChanged = purchasesAtSave.length > 0 || fingerprint(expected) !== fingerprint(payload)
    const topLevelChanged = topLevelFingerprint !== lastTopLevelFingerprint
    if (!progressChanged && !topLevelChanged) return { saved: true, shouldWarn: false }

    const client = await getProgressClient()
    if (!isFirebaseProgressHydrated({ uid: uidAtRequest }) || persistenceSession !== session) return { saved: false, shouldWarn: false }
    if (typeof client.transaction !== 'function' || typeof client.update !== 'function') throw new FirebaseProgressError('Transactional progress storage is required.', 'transaction-unavailable')

    let receipts = {}
    let savedProgress = null
    if (progressChanged) {
      let sentFingerprint = ''
      // Scoped to users/{uid}/progress: no other part of the user node is read or written.
      const result = await client.transaction(`users/${uidAtRequest}/progress`, current => {
        // An SDK retry after our own write already landed (ack lost): bump the revision only.
        if (sentFingerprint && current && fingerprint(current) === sentFingerprint) {
          return { ...current, checkpointRevision: (current.checkpointRevision ?? 0) + 1 }
        }
        // RTDB first runs a transaction against an empty local cache, then retries against the
        // authoritative node. Returning undefined here would abort forever.
        const server = current && typeof current === 'object' ? current : structuredClone(expected)
        const attemptReceipts = {}
        let refund = 0
        const projected = { passiveUpgrades: { ...server.passiveUpgrades }, weaponPermanentUpgrades: { ...server.weaponPermanentUpgrades } }
        for (const [operationId, purchase] of purchasesAtSave) {
          const conflict = (projected[purchase.category][purchase.id] ?? 0) !== purchase.fromLevel || (server.goldTotal ?? 0) < purchase.price
          attemptReceipts[operationId] = conflict ? 'conflict' : 'accepted'
          if (!conflict) projected[purchase.category][purchase.id] = purchase.nextLevel
          else if (!purchase.refundApplied) refund += purchase.price
        }
        for (const category of ['passiveUpgrades','weaponPermanentUpgrades']) {
          for (const [key,value] of Object.entries(payload[category])) {
            if (purchasesAtSave.some(([,p]) => p.category === category && p.id === key)) continue
            if (value === (base[category][key] ?? 0)) continue
            if ((server[category]?.[key] ?? 0) !== (base[category][key] ?? 0)) return undefined
          }
        }
        const next = mergeChangedProgress(server, expected, payload)
        for (const [, purchase] of purchasesAtSave) {
          next[purchase.category] = { ...next[purchase.category], [purchase.id]: projected[purchase.category][purchase.id] ?? 0 }
        }
        next.checkpointRevision = (server.checkpointRevision ?? 0) + 1
        next.goldTotal = Math.min(MAX_GOLD_TOTAL, Math.max(0, (server.goldTotal ?? 0) + delta.gold + refund))
        next.records = { ...(server.records ?? {}) }
        for (const key of RECORD_KEYS) {
          const prior = server.records?.[key] ?? 0
          next.records[key] = /best/i.test(key)
            ? Math.max(prior, payload.records[key])
            : Math.min(MAX_RECORD_VALUE, prior + Math.max(0, delta.records[key]))
        }
        next.missions = next.missions && typeof next.missions === 'object' ? { ...next.missions } : structuredClone(payload.missions)
        next.missions.counters = { ...(server.missions?.counters ?? {}) }
        for (const [key, value] of Object.entries(payload.missions.counters)) {
          const prior = server.missions?.counters?.[key] ?? 0
          next.missions.counters[key] = Math.min(MAX_MISSION_COUNTER_VALUE, isMaxMissionCounter(key)
            ? Math.max(prior, value)
            : prior + Math.max(0, delta.missionCounters[key] ?? 0))
        }
        if (next.missions.active && server.missions?.active) {
          next.missions.active = { ...next.missions.active }
          for (const [id, entry] of Object.entries(server.missions.active)) {
            if (next.missions.active[id]) next.missions.active[id] = { ...next.missions.active[id], counter: Math.max(entry?.counter ?? 0, next.missions.active[id].counter ?? 0) }
          }
        }
        receipts = attemptReceipts
        sentFingerprint = fingerprint(next)
        return next
      })
      if (!result?.committed) throw new FirebaseProgressError('Progress transaction was not acknowledged.', 'save-not-acknowledged')
      savedProgress = readTransactionSnapshotValue(result.snapshot)
    }
    if (topLevelChanged || progressChanged) {
      await client.update(`users/${uidAtRequest}`, { ...topLevel, updatedAt: new Date().toISOString() })
    }
    let purchaseConflict = false
    if (isFirebaseProgressHydrated({ uid: uidAtRequest }) && persistenceSession === session) {
      lastTopLevelFingerprint = topLevelFingerprint
      // What the server now holds, in this session's local terms.
      const nextBase = progressAtSave
      nextBase.goldTotal -= inflightAtSave.gold
      for (const [key, value] of Object.entries(inflightAtSave.records)) nextBase.records[key] -= value
      for (const [key, value] of Object.entries(inflightAtSave.missionCounters)) nextBase.missions.counters[key] = (nextBase.missions.counters[key] ?? 0) - value
      for (const [operationId, purchase] of purchasesAtSave) {
        purchaseOperations.delete(operationId)
        if (receipts[operationId] !== 'conflict' || purchase.refundApplied) continue
        purchase.refundApplied = true
        purchaseConflict = true
        const serverLevel = savedProgress?.[purchase.category]?.[purchase.id] ?? 0
        nextBase.goldTotal += purchase.price
        nextBase[purchase.category][purchase.id] = serverLevel
        const progress = cloneProgress(runtime.progress)
        progress.goldTotal += purchase.price
        if (progress[purchase.category][purchase.id] === payload[purchase.category][purchase.id]) progress[purchase.category][purchase.id] = serverLevel
        runtime = { ...runtime, progress }
      }
      persistenceBase = { ...persistenceBase, progress: nextBase }
    }
    return { saved: !purchaseConflict, shouldWarn: purchaseConflict }
  }).catch(error => {
    console.warn('Firebase progress was not acknowledged.', error?.code ?? error?.message ?? 'save-failed')
    return { saved: false, shouldWarn: true }
  })
  writeQueue = attempt.then(({ saved }) => saved)
  const { saved, shouldWarn } = await attempt
  if (shouldWarn || !rowsWritten) markProgressSaveWarning(uidAtRequest)
  if (!rowsWritten) return false
  if (saved && repeat < MAX_SAVE_REPEATS && isFirebaseProgressHydrated({uid:uidAtRequest}) && runtime !== runtimeAtSave) return performCloudProgressSave(user, repeat + 1)
  return saved
}

// Apply only locally changed leaves; a stale tab must retain remote purchases,
// mission receipts, settings and unknown fields. Scope: one progress node.
function mergeChangedProgress(current, base, next) {
  if (current === undefined) return structuredClone(next)
  if (JSON.stringify(base) === JSON.stringify(next)) return structuredClone(current)
  if (!next || typeof next !== 'object' || Array.isArray(next)) return structuredClone(next)
  const merged = { ...(current && typeof current === 'object' ? current : {}) }
  for (const key of Object.keys(next)) {
    if (JSON.stringify(base?.[key]) !== JSON.stringify(next[key])) {
      merged[key] = mergeChangedProgress(current?.[key], base?.[key], next[key])
    }
  }
  return merged
}

// Key-order independent and blind to what RTDB never stores (null, empty objects/arrays), so a
// value read back from the server compares equal to the value that was written.
function fingerprint(value) {
  return JSON.stringify(canonicalize(value)) ?? ''
}

function canonicalize(value) {
  if (Array.isArray(value)) value = Object.fromEntries(value.map((item, index) => [String(index), item]))
  if (!value || typeof value !== 'object') return value ?? undefined
  const out = {}
  for (const key of Object.keys(value).sort()) {
    const child = canonicalize(value[key])
    if (child === undefined || child === null) continue
    if (typeof child === 'object' && Object.keys(child).length === 0) continue
    out[key] = child
  }
  return out
}

export function consumeFirebaseProgressSaveWarning() {
  const warning = pendingProgressSaveWarning
  pendingProgressSaveWarning = null
  return warning
}

function markProgressSaveWarning(uidAtRequest) {
  if (!uidAtRequest || uidAtRequest !== readUserId(cloudUser)) return
  pendingProgressSaveWarning = 'save-failed'
}

export function installPlayerStorageFatalGuard() {
  if (storageGuardInstalled || typeof Storage === 'undefined') return false
  storageGuardInstalled = true
  for (const method of ['getItem', 'setItem', 'removeItem']) {
    const original = Storage.prototype[method]
    Object.defineProperty(Storage.prototype, method, {
      configurable: true,
      value: function guardedPlayerStorageAccess(key, ...args) {
        assertNotPlayerDurableStorageKey(key)
        return original.call(this, key, ...args)
      },
    })
  }
  if (typeof indexedDB !== 'undefined' && typeof indexedDB.open === 'function') {
    const originalOpen = indexedDB.open.bind(indexedDB)
    indexedDB.open = (name, ...args) => {
      assertNotPlayerDurableStorageKey(name)
      return originalOpen(name, ...args)
    }
  }
  return true
}

export function assertNotPlayerDurableStorageKey(key) {
  if (PLAYER_DURABLE_STORAGE_KEY_SET.has(String(key))) {
    throw new FirebaseProgressError(
      `Firebase-only player data cannot use browser durable storage key: ${key}`,
      'player-local-storage-forbidden',
    )
  }
}

export function _setFirebaseProgressClientForTests(client) {
  testProgressClient = client
  progressClientPromise = null
}

export function _resetFirebaseProgressForTests() {
  cloudUser = null
  progressClientPromise = null
  // Vitest must never fall through to the real Firebase SDK after a reset.
  // Tests that need transport behavior replace this with their explicit fake.
  testProgressClient = VITEST_PROGRESS_CLIENT
  writeQueue = Promise.resolve()
  pendingProgressSaveWarning = null
  runtime = createEmptyRuntime()
  persistenceSession = ''
  persistenceBase = null
  resetSessionState()
  _resetStageSlotForTests()
}

export function _seedHydratedFirebaseProgressForTests(user = { uid: 'test-user' }, snapshot = null) {
  const uid = readUserId(user) || 'test-user'
  applyCloudProgressSnapshot(snapshot ?? {
    schemaVersion: SCHEMA_VERSION,
    profile: { uid, displayName: user.displayName ?? '', nickname: '' },
    progress: createEmptyProgress(),
  }, { ...user, uid })
}

async function getProgressClient() {
  if (testProgressClient) return testProgressClient
  if (!progressClientPromise) {
    progressClientPromise = createFirebaseProgressClient().catch(error => {
      progressClientPromise = null
      throw error
    })
  }
  return progressClientPromise
}

export async function createFirebaseProgressClient(env = getDefaultEnv()) {
  const [{ initializeApp, getApp, getApps }, databaseModule] = await Promise.all([
    import('firebase/app'),
    import('firebase/database'),
  ])
  const config = getFirebaseConfig(env)
  const app = getApps().length > 0 ? getApp() : initializeApp(config)
  const database = databaseModule.getDatabase(app, readEnv(env, DATABASE_URL_KEY))
  const load = async (path) => {
    const snapshot = await databaseModule.get(databaseModule.ref(database, path))
    return snapshot.exists() ? snapshot.val() : null
  }

  return {
    update: (path, values) => databaseModule.update(databaseModule.ref(database, path), values),
    increment: (delta) => databaseModule.increment(delta),
    remove: (path) => databaseModule.remove(databaseModule.ref(database, path)),
    transaction: async (path, mutator) => databaseModule.runTransaction(databaseModule.ref(database, path), mutator),
    load,
    // One read per named child; the rest of the user node (checkpointLedger) is never downloaded.
    loadFields: async (path, fields) => Object.fromEntries(await Promise.all(fields.map(async field => [field, await load(`${path}/${field}`)]))),
  }
}

function buildTopLevelFields() {
  return {
    profile: { ...runtime.profile },
    ...(runtime.activity ? { activity: { ...runtime.activity } } : {}),
    ...(runtime.consent ? { consent: cloneConsent(runtime.consent) } : {}),
  }
}

function buildTopLevelPayload(now = Date.now()) {
  ensureHydrated()
  return { ...buildTopLevelFields(), updatedAt: new Date(now).toISOString() }
}

// Mission identifiers use dots in memory; RTDB rejects dots in object keys
// before any network write. % cannot appear in canonical counter keys, making
// this encoding unambiguous while leaving all counter values unchanged.
function serializeProgress(value) {
  const progress = cloneProgress(value)
  progress.records = normalizeNumberMap(progress.records, RECORD_KEYS)
  progress.missions.counters = Object.fromEntries(Object.entries(progress.missions.counters).map(([key,count]) => [key.replaceAll('.', '%2E'),count]))
  return progress
}

function isRuntimeHydrated() {
  return !!(runtime.hydrated && runtime.remoteHydrated && runtime.uid && runtime.progress)
}

function ensureHydrated() {
  if (isRuntimeHydrated()) return
  throw new FirebaseProgressError(
    'Firebase player progress is unavailable until the authenticated remote snapshot is applied.',
    'progress-not-hydrated',
  )
}

function normalizeRemoteSnapshot(snapshot, uid, user) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null
  if (Number(snapshot.schemaVersion ?? SCHEMA_VERSION) !== SCHEMA_VERSION) return null
  if (!snapshot.progress || typeof snapshot.progress !== 'object' || Array.isArray(snapshot.progress)) return null
  return {
    profile: normalizeProfile({ uid, displayName: user?.displayName, ...snapshot.profile }, uid),
    progress: normalizeProgress(snapshot.progress),
    activity: normalizePlayActivity(snapshot.activity),
    consent: normalizeConsent(snapshot.consent),
  }
}

function createEmptyRuntime(uid = '') {
  return {
    uid,
    hydrated: false,
    remoteHydrated: false,
    profile: normalizeProfile({ uid }, uid),
    // UID-only state must not carry a zero-value player progress object.  Any reader or
    // writer before the verified Firebase snapshot is a fatal progress boundary violation.
    progress: null,
    activity: null,
    consent: null,
  }
}

function createEmptyProgress() {
  return {
    goldTotal: 0,
    records: Object.fromEntries(RECORD_KEYS.map((key) => [key, 0])),
    weaponUnlockSchemaVersion: WEAPON_UNLOCK_SCHEMA_VERSION,
    weaponUnlocks: {},
    // Rosari wardrobe outfit ownership (outfitUnlocks.js). Same shape as weaponUnlocks; `default` is never stored.
    outfitUnlocks: {},
    weaponPermanentUpgrades: {},
    passiveUpgrades: {},
    bossPassiveUnlocks: {},
    encounteredZombieTypes: {},
    missions: createEmptyMissionProgress(),
    titleSettings: { ...DEFAULT_TITLE_SETTINGS },
  }
}

function normalizeProgress(progress) {
  const out = createEmptyProgress()
  out.goldTotal = readNonNegativeInt(progress.goldTotal)
  out.records = normalizeNumberMap(progress.records, RECORD_KEYS)
  // Retain any genuine dedicated proof in memory, never coerce malformed values.
  for (const key of BOSS_RECORD_KEYS) {
    const value = progress.records?.[key]
    if (Number.isSafeInteger(value) && value >= 1) out.records[key] = value
  }
  out.weaponUnlockSchemaVersion = normalizeWeaponUnlockSchemaVersion(progress.weaponUnlockSchemaVersion)
  out.weaponUnlocks = normalizeFlagMap(progress.weaponUnlocks)
  out.outfitUnlocks = normalizeOutfitUnlockMap(progress.outfitUnlocks)
  out.weaponPermanentUpgrades = normalizeNumberMap(progress.weaponPermanentUpgrades)
  out.passiveUpgrades = normalizeNumberMap(progress.passiveUpgrades)
  out.bossPassiveUnlocks = normalizeBossPassiveUnlocks(progress.bossPassiveUnlocks)
  out.encounteredZombieTypes = normalizeZombieEncounterMap(progress.encounteredZombieTypes)
  out.missions = normalizeMissionProgress(progress.missions)
  out.titleSettings = normalizeTitleSettings(progress.titleSettings)
  return out
}

function createEmptyMissionProgress() {
  return {
    schemaVersion: MISSION_PROGRESS_SCHEMA_VERSION,
    catalogVersion: DEFAULT_MISSION_CATALOG_VERSION,
    updatedAt: '',
    counters: {},
    active: {},
    completed: {},
    claimed: {},
    pinnedMissionIds: [],
    claimLedger: {},
  }
}

function normalizeMissionProgress(value) {
  const out = createEmptyMissionProgress()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  out.schemaVersion = MISSION_PROGRESS_SCHEMA_VERSION
  out.catalogVersion = readMissionCatalogVersion(value.catalogVersion || value.missionCatalogVersion)
  out.updatedAt = readNullableIsoString(value.updatedAt) || ''
  out.counters = normalizeMissionCounters(value.counters)
  out.active = normalizeMissionEntryMap(value.active, normalizeMissionEntry)
  out.completed = normalizeMissionEntryMap(value.completed, normalizeMissionCompletedEntry)
  out.claimed = normalizeMissionEntryMap(value.claimed, normalizeMissionClaimedEntry)
  out.pinnedMissionIds = normalizePinnedMissionIds(value.pinnedMissionIds || value.pinnedIds)
  out.claimLedger = normalizeMissionClaimLedger(value.claimLedger)
  return out
}

function normalizeMissionCounters(value) {
  const out = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [wireKey, raw] of Object.entries(value)) {
    const key = wireKey.replaceAll('%2E', '.')
    if (!MISSION_COUNTER_KEY_PATTERN.test(key)) continue
    out[key] = Math.min(readNonNegativeInt(raw), MAX_MISSION_COUNTER_VALUE)
  }
  return out
}

function normalizeMissionEntryMap(value, normalizer) {
  const out = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [missionId, raw] of Object.entries(value)) {
    const safeMissionId = normalizeMissionId(missionId)
    if (!safeMissionId) continue
    const entry = normalizer(raw)
    if (entry) out[safeMissionId] = entry
  }
  return out
}

function normalizeMissionEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const counter = Math.min(readNonNegativeInt(value.counter), MAX_MISSION_COUNTER_VALUE)
  const target = Math.min(readPositiveInt(value.target, 1), MAX_MISSION_COUNTER_VALUE)
  return {
    counter,
    target,
    completedAt: readNullableIsoString(value.completedAt),
    claimedAt: readNullableIsoString(value.claimedAt),
    claimId: readNullableClaimId(value.claimId),
  }
}

function normalizeMissionCompletedEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const completedAt = readNullableIsoString(value.completedAt)
  if (!completedAt) return null
  return {
    completedAt,
    counter: Math.min(readNonNegativeInt(value.counter), MAX_MISSION_COUNTER_VALUE),
    target: Math.min(readPositiveInt(value.target, 1), MAX_MISSION_COUNTER_VALUE),
  }
}

function normalizeMissionClaimedEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const claimedAt = readNullableIsoString(value.claimedAt)
  const claimId = readNullableClaimId(value.claimId)
  const reward = normalizeMissionReward(value.reward)
  if (!claimedAt || !claimId || !reward) return null
  return {
    claimedAt,
    claimId,
    catalogVersion: readMissionCatalogVersion(value.catalogVersion),
    reward,
  }
}

function normalizeMissionClaimLedger(value) {
  const out = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [claimId, raw] of Object.entries(value)) {
    if (!MISSION_CLAIM_ID_PATTERN.test(claimId)) continue
    const missionId = normalizeMissionId(raw?.missionId || claimId.split(':')[0])
    const catalogVersion = readMissionCatalogVersion(raw?.catalogVersion || claimId.split(':').slice(1).join(':'))
    const entry = normalizeMissionClaimLedgerEntry(raw, missionId, catalogVersion)
    if (entry) out[claimId] = entry
  }
  return out
}

function normalizeMissionClaimLedgerEntry(value, missionId, catalogVersion) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const safeMissionId = normalizeMissionId(missionId)
  const claimedAt = readNullableIsoString(value.claimedAt)
  const reward = normalizeMissionReward(value.reward)
  if (!safeMissionId || !claimedAt || !reward) return null
  return {
    missionId: safeMissionId,
    catalogVersion: readMissionCatalogVersion(catalogVersion || value.catalogVersion),
    claimedAt,
    reward,
  }
}

function normalizePinnedMissionIds(value) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const raw of value) {
    const missionId = normalizeMissionId(raw)
    if (missionId && !out.includes(missionId)) out.push(missionId)
    if (out.length >= MAX_PINNED_MISSION_IDS) break
  }
  return out
}

function normalizeProfile(profile, uid) {
  return {
    uid,
    displayName: readString(profile?.displayName),
    nickname: readString(profile?.nickname),
  }
}

function normalizeNumberMap(value, requiredKeys = null) {
  const out = requiredKeys ? Object.fromEntries(requiredKeys.map((key) => [key, 0])) : {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [key, raw] of Object.entries(value)) {
    const number = readNonNegativeInt(raw)
    if (!requiredKeys || requiredKeys.includes(key)) out[key] = number
  }
  return out
}

// Only ids the RTDB rule accepts (progress/outfitUnlocks/$outfitId) survive; `default` is always owned
// and never stored, and an unknown id must not ride along into the next whole-progress save.
function normalizeOutfitUnlockMap(value) {
  const out = {}
  for (const key of Object.keys(normalizeFlagMap(value))) {
    if (isPlayerOutfitId(key) && key !== 'default') out[key] = 1
  }
  return out
}

function normalizeFlagMap(value) {
  const out = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [key, raw] of Object.entries(value)) {
    if (raw === 1 || raw === true) out[key] = 1
  }
  return out
}

function normalizeWeaponUnlockSchemaVersion(value) {
  const version = readNonNegativeInt(value)
  return version >= WEAPON_UNLOCK_SCHEMA_VERSION ? version : 1
}

function migrateLegacyWeaponUnlockEntitlements() {
  if (!runtime.progress || runtime.progress.weaponUnlockSchemaVersion >= WEAPON_UNLOCK_SCHEMA_VERSION) return false
  runtime = {
    ...runtime,
    progress: {
      ...runtime.progress,
      weaponUnlockSchemaVersion: WEAPON_UNLOCK_SCHEMA_VERSION,
      weaponUnlocks: mergeLegacyAccountEntitlements(runtime.progress.weaponUnlocks),
    },
  }
  return true
}

function normalizeZombieEncounterMap(value) {
  const out = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [key, raw] of Object.entries(value)) {
    if (ZOMBIE_ENCOUNTER_TYPES.has(key) && (raw === 1 || raw === true)) out[key] = 1
  }
  return out
}

function normalizeTitleSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_TITLE_SETTINGS }
  return {
    ...(isPlayerAppearance(value.playerAppearance)
      ? { playerAppearance: value.playerAppearance } : {}),
    // Rosari wardrobe outfit: separate axis from playerAppearance. Unknown values are dropped (=> 'default').
    ...(isPlayerOutfitId(value.playerOutfit)
      ? { playerOutfit: value.playerOutfit } : {}),
    language: SUPPORTED_LANGUAGES.has(value.language) ? value.language : DEFAULT_TITLE_SETTINGS.language,
    vibration: typeof value.vibration === 'boolean' ? value.vibration : DEFAULT_TITLE_SETTINGS.vibration,
    reducedEffects: typeof value.reducedEffects === 'boolean' ? value.reducedEffects : DEFAULT_TITLE_SETTINGS.reducedEffects,
    hitCameraShake: typeof value.hitCameraShake === 'boolean' ? value.hitCameraShake : DEFAULT_TITLE_SETTINGS.hitCameraShake,
    unlockAllWeaponsCheat: typeof value.unlockAllWeaponsCheat === 'boolean'
      ? value.unlockAllWeaponsCheat
      : DEFAULT_TITLE_SETTINGS.unlockAllWeaponsCheat,
    unlockAllStagesCheat: typeof value.unlockAllStagesCheat === 'boolean'
      ? value.unlockAllStagesCheat
      : DEFAULT_TITLE_SETTINGS.unlockAllStagesCheat,
  }
}

function normalizePlayActivity(activity) {
  if (!activity || typeof activity !== 'object') return null
  if (typeof activity.lastStageId !== 'string' || activity.lastStageId.trim().length === 0) return null
  if (typeof activity.lastStartedAt !== 'string' || Number.isNaN(Date.parse(activity.lastStartedAt))) return null
  return {
    lastStageId: activity.lastStageId.trim(),
    lastStartedAt: activity.lastStartedAt,
  }
}

function normalizeConsent(consent) {
  if (!consent || typeof consent !== 'object' || Array.isArray(consent)) return null
  const terms = normalizeConsentItem(consent.terms)
  const privacy = normalizeConsentItem(consent.privacy)
  if (!terms && !privacy) return null
  return {
    ...(terms ? { terms } : {}),
    ...(privacy ? { privacy } : {}),
  }
}

function normalizeConsentItem(item) {
  if (!item || typeof item !== 'object') return null
  const version = Number(item.version)
  if (!Number.isFinite(version) || version < 1) return null
  const acceptedAt = readString(item.acceptedAt)
  if (!acceptedAt || Number.isNaN(Date.parse(acceptedAt))) return null
  return { version: Math.floor(version), acceptedAt }
}

function cloneConsent(consent) {
  if (!consent) return null
  return {
    ...(consent.terms ? { terms: { ...consent.terms } } : {}),
    ...(consent.privacy ? { privacy: { ...consent.privacy } } : {}),
  }
}

function cloneRuntime(value) {
  return {
    uid: value.uid,
    hydrated: value.hydrated,
    remoteHydrated: value.remoteHydrated,
    profile: { ...value.profile },
    progress: value.progress ? cloneProgress(value.progress) : null,
    activity: value.activity ? { ...value.activity } : null,
    consent: cloneConsent(value.consent),
  }
}

function cloneProgress(progress) {
  return {
    goldTotal: progress.goldTotal,
    records: { ...progress.records },
    weaponUnlockSchemaVersion: progress.weaponUnlockSchemaVersion,
    weaponUnlocks: { ...progress.weaponUnlocks },
    outfitUnlocks: { ...progress.outfitUnlocks },
    weaponPermanentUpgrades: { ...progress.weaponPermanentUpgrades },
    passiveUpgrades: { ...progress.passiveUpgrades },
    bossPassiveUnlocks: { ...progress.bossPassiveUnlocks },
    encounteredZombieTypes: { ...progress.encounteredZombieTypes },
    missions: cloneMissionProgress(progress.missions),
    titleSettings: { ...progress.titleSettings },
  }
}

function cloneMissionProgress(missions) {
  const normalized = normalizeMissionProgress(missions)
  return {
    schemaVersion: normalized.schemaVersion,
    catalogVersion: normalized.catalogVersion,
    updatedAt: normalized.updatedAt,
    counters: { ...normalized.counters },
    active: Object.fromEntries(Object.entries(normalized.active).map(([key, value]) => [key, { ...value }])),
    completed: Object.fromEntries(Object.entries(normalized.completed).map(([key, value]) => [key, { ...value }])),
    claimed: Object.fromEntries(Object.entries(normalized.claimed).map(([key, value]) => [key, { ...value, reward: value.reward ? { ...value.reward } : null }])),
    pinnedMissionIds: [...normalized.pinnedMissionIds],
    claimLedger: Object.fromEntries(Object.entries(normalized.claimLedger).map(([key, value]) => [key, { ...value, reward: { ...value.reward } }])),
  }
}

function readNonNegativeInt(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0
}

function readPositiveInt(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback
}

function normalizeMissionId(value) {
  const missionId = typeof value === 'string' ? value.trim() : ''
  return MISSION_ID_PATTERN.test(missionId) ? missionId : ''
}

function readMissionCatalogVersion(value) {
  const catalogVersion = typeof value === 'string' ? value.trim() : ''
  return /^missions_[0-9]{4}_[0-9]{2}_[0-9]{2}_v[0-9]+$/.test(catalogVersion)
    ? catalogVersion
    : DEFAULT_MISSION_CATALOG_VERSION
}

function readNullableIsoString(value) {
  if (value == null) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 40 || Number.isNaN(Date.parse(trimmed))) return null
  return trimmed
}

function readNullableClaimId(value) {
  if (value == null) return null
  const claimId = typeof value === 'string' ? value.trim() : ''
  return MISSION_CLAIM_ID_PATTERN.test(claimId) ? claimId : null
}

function normalizeMissionReward(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (value.type !== 'gold') return null
  const amount = readPositiveInt(value.amount, 0)
  if (amount <= 0 || amount > 1000000) return null
  return { type: 'gold', amount }
}

// completion: missionCatalog의 { type: 'counter', counterKey, target } | { type: 'any-counter', counterKeys, target }.
function readMissionCounterCompletion(counters, completion) {
  const target = readPositiveInt(completion?.target, 0)
  const keys = completion?.type === 'any-counter' ? completion.counterKeys : [completion?.counterKey]
  if (!target || !Array.isArray(keys) || keys.length === 0) return null
  const counter = Math.max(0, ...keys.map((key) => (typeof key === 'string' ? readNonNegativeInt(counters?.[key]) : 0)))
  return { counter: Math.min(counter, target), target, complete: counter >= target }
}

function readAllowedMissionReward(rewardAllowlist, missionId) {
  if (!missionId || !rewardAllowlist || typeof rewardAllowlist !== 'object' || Array.isArray(rewardAllowlist)) return null
  return normalizeMissionReward(rewardAllowlist[missionId])
}

function readTransactionSnapshotValue(snapshot) {
  if (!snapshot) return null
  if (typeof snapshot.val === 'function') return snapshot.val()
  if ('value' in snapshot) return snapshot.value
  return snapshot
}

function readErrorCode(error, fallback) {
  if (error instanceof FirebaseProgressError) return error.code
  return typeof error?.code === 'string' && error.code ? error.code : fallback
}

function readEnv(env, key) {
  const value = env?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function readString(value) {
  return typeof value === 'string' ? value : ''
}

function readUserId(user) {
  return typeof user?.uid === 'string' ? user.uid.trim() : ''
}

function getDefaultEnv() {
  if (typeof import.meta !== 'undefined' && import.meta.env) return import.meta.env
  if (typeof process !== 'undefined') return process.env
  return {}
}
