// @vitest-environment jsdom
// Local snapshots/injected transports only. Never connects to Firebase.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetFirebaseProgressForTests, _setFirebaseProgressClientForTests, applyCloudProgressSnapshot, buildCloudProgressSnapshot, requestCloudProgressSave } from './firebaseProgress.js'
import { load, incrementRecord, setBestIfHigher } from './playerRecords.js'
import { getZombieTypeLabel, isKnownZombieType, normalizeZombieEncounterMap, recordZombieEncounter } from './zombieEncyclopedia.js'
import { getRankingScorePolicy, getStagePriority, getRankingScore, getBossClearBonus } from './rankingScorePolicy.js'
import { ALLOWED_STAGE_IDS, SERVER_STAGE_BONUS, expectedScore, normalizeRun } from '../../functions/src/ranking.js'

const contract = JSON.parse(readFileSync(resolve('../../Planner/expansion_20261016/content_data.json'), 'utf8'))
const actors = [...contract.enemies, ...contract.bosses]
const user = { uid: 'expansion-unit-fixture' }
const snapshot = (progress = {}) => ({ schemaVersion: 1, profile: { uid: user.uid, displayName: 'Fixture', nickname: '' }, progress: { goldTotal: 42, weaponUnlockSchemaVersion: 2, ...progress } })

beforeEach(() => _resetFirebaseProgressForTests())
afterEach(() => vi.unstubAllEnvs())

describe('expansion persistence contract', () => {
  it('preserves all ten new record fields through hydrate, mutation, save and rehydrate without losing Stage1-5', async () => {
    const records = { totalRuns: 8, bestSurvivalSeconds: 766, stage1Clears: 3, stage2Clears: 2, stage2BestSurvivalSec: 366, stage3Clears: 1, stage3BestSurvivalSec: 321, stage4Clears: 1, stage4BestSurvivalSec: 481, stage5Clears: 1, stage5BestSurvivalSec: 300 }
    for (const stage of contract.stages) Object.assign(records, { [stage.clearRecordKey]: 2, [stage.bestRecordKey]: 600 })
    applyCloudProgressSnapshot(snapshot({ records }), user)
    for (const stage of contract.stages) {
      expect(load()[stage.clearRecordKey]).toBe(2)
      incrementRecord(stage.clearRecordKey)
      setBestIfHigher(stage.bestRecordKey, 700)
      setBestIfHigher(stage.bestRecordKey, 200)
    }
    let saved
    _setFirebaseProgressClientForTests({ save: async (_path, payload) => { saved = structuredClone(payload) } })
    for (const [key, value] of Object.entries({ VITE_FIREBASE_API_KEY: 'fixture', VITE_FIREBASE_AUTH_DOMAIN: 'fixture.invalid', VITE_FIREBASE_DATABASE_URL: 'https://fixture.invalid', VITE_FIREBASE_PROJECT_ID: 'fixture', VITE_FIREBASE_APP_ID: 'fixture' })) vi.stubEnv(key, value)
    expect(await requestCloudProgressSave(user)).toBe(true)
    expect(saved.schemaVersion).toBe(1)
    applyCloudProgressSnapshot(saved, user)
    for (const stage of contract.stages) {
      expect(load()[stage.clearRecordKey]).toBe(3)
      expect(load()[stage.bestRecordKey]).toBe(700)
    }
    for (const [key, value] of Object.entries(records).filter(([key]) => !/^stage(?:[6-9]|10)/.test(key))) expect(load()[key]).toBe(value)
    expect(buildCloudProgressSnapshot().progress.goldTotal).toBe(42)
  })

  it('defaults missing additive fields, strips unknown records and preserves only real boss passives', () => {
    applyCloudProgressSnapshot(snapshot({ records: { stage6Clears: -3, stage7BestSurvivalSec: 'bad', stage11Clears: 9 }, bossPassiveUnlocks: { b01SetSquare: true, b05Invented: true } }), user)
    const progress = buildCloudProgressSnapshot().progress
    for (const stage of contract.stages) {
      expect(progress.records[stage.clearRecordKey]).toBe(0)
      expect(progress.records[stage.bestRecordKey]).toBe(0)
    }
    expect(progress.records).not.toHaveProperty('stage11Clears')
    expect(progress.bossPassiveUnlocks).toEqual({ b01SetSquare: true })
  })

  it.each(actors)('records $id with its exact authored label without waiting for runtime pool registration', ({ id, nameKo }) => {
    applyCloudProgressSnapshot(snapshot({ encounteredZombieTypes: { E01: 1 } }), user)
    expect(isKnownZombieType(id)).toBe(true)
    expect(getZombieTypeLabel(id)).toBe(nameKo)
    expect(recordZombieEncounter(id)).toBe(true)
    expect(recordZombieEncounter(id)).toBe(false)
    const saved = buildCloudProgressSnapshot()
    applyCloudProgressSnapshot(saved, user)
    expect(buildCloudProgressSnapshot().progress.encounteredZombieTypes).toEqual({ E01: 1, [id]: 1 })
  })

  it('keeps unknown encounter IDs and malformed values out of both normalizers', () => {
    const invalid = { E18: 1, E34: 1, B10: 1, E19: '1', E20: 2, B05: false }
    expect(normalizeZombieEncounterMap(invalid)).toEqual({})
    applyCloudProgressSnapshot(snapshot({ encounteredZombieTypes: invalid }), user)
    expect(buildCloudProgressSnapshot().progress.encounteredZombieTypes).toEqual({})
    expect(recordZombieEncounter('E34')).toBe(false)
  })

  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('keeps stage%s client/server bonus, priority and score parity', (order) => {
    const stageId = `stage${order}`
    const bonus = 60 * (order - 1)
    if (order >= 6) expect(contract.stages.find((stage) => stage.id === stageId).scoreStageBonus).toBe(bonus)
    expect(getRankingScorePolicy({}).stageBonus[stageId]).toBe(bonus)
    expect(SERVER_STAGE_BONUS[stageId]).toBe(bonus)
    expect(getStagePriority(stageId)).toBe(order)
    expect(ALLOWED_STAGE_IDS.has(stageId)).toBe(true)
    for (const cleared of [false, true]) {
      for (const bossDefeated of [false, true]) {
        const args = { stageId, survivalSeconds: 360000, cleared, bossDefeated }
        const score = getRankingScore({ ...args, bossBonus: getBossClearBonus(args) })
        expect(expectedScore(stageId, 360000000, cleared, bossDefeated)).toBe(score)
        expect(normalizeRun({ runId: 'expansion_test_run', stageId, score, timeMs: 360000000, cleared }).stageId).toBe(stageId)
      }
    }
  })

  it.each(['stage11', 'stage0', 'stage6/other', 'stage01'])('rejects unknown server stage %s', (stageId) => {
    expect(() => normalizeRun({ runId: 'expansion_test_run', stageId, score: 1, timeMs: 1000 })).toThrow('Unknown stageId')
  })
})
