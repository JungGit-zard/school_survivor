// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

vi.mock('../lib/firebaseRanking.js', async (importOriginal) => ({
  ...(await importOriginal()),
  submitRun: vi.fn(async () => ({ written: [], skipped: [], failed: [] })),
}))

import { installProgressTransactionTestClient } from '../../test/progressTransactionClient.js'
import { _resetFirebaseProgressForTests, _setFirebaseProgressClientForTests, hydrateCloudProgress, readFirebasePlayerProgress, requestCloudProgressSave } from '../lib/firebaseProgress.js'
import { readStoredStageSlot } from '../lib/stageSlot.js'
import { isStageUnlocked } from '../lib/stageConfig.js'
import { useGameStore } from './useGameStore.js'

const ENV = {
  VITE_FIREBASE_API_KEY: 'api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'school-survivor.firebaseapp.com',
  VITE_FIREBASE_DATABASE_URL: 'https://example-rtdb.firebaseio.com',
  VITE_FIREBASE_PROJECT_ID: 'school-survivor',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
}

beforeEach(() => {
  for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value)
  localStorage.clear()
})
afterEach(() => vi.unstubAllEnvs())

it('in-run events make no cloud writes; the stage end writes its result once and clears the device slot', async () => {
  const db = installProgressTransactionTestClient()
  const uid = 'test-user'
  expect(useGameStore.getState().resetGame('stage1')).toBe(true)
  await requestCloudProgressSave({ uid }) // run-start activity save
  const writesAtStart = db.writes.length

  useGameStore.getState().gainGold(7)
  useGameStore.setState({ runKills: 5, elapsedMs: 61_000 })
  useGameStore.getState().recordMissionEvent({ type: 'enemy_killed', stageId: 'stage1', enemyType: 'E01', weaponKey: 'pencilThrow' })
  useGameStore.getState().spawnBoss()
  useGameStore.getState().recordBossDefeat()
  await Promise.resolve()
  expect(db.writes.length).toBe(writesAtStart)
  expect(readFirebasePlayerProgress().goldTotal).toBe(0)
  expect(readStoredStageSlot(uid)).toBeTruthy()

  useGameStore.setState({ phase: 'gameover' })
  useGameStore.getState()._onRunEnd('gameover')
  expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
  expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)

  const rowWrites = db.writes.filter(write => write.kind === 'update' && Object.keys(write.values).some(key => key.startsWith('runLedger/')))
  expect(rowWrites).toHaveLength(1)
  const node = db.get(`users/${uid}`)
  expect(node.progress.goldTotal).toBe(7)
  expect(node.progress.records.totalKills).toBe(5)
  expect(Object.keys(node.runLedger)).toHaveLength(1)
  expect(readStoredStageSlot(uid)).toBeNull()

  // A fresh sign-in sees the boss proof from the one row.
  _resetFirebaseProgressForTests()
  _setFirebaseProgressClientForTests(db)
  await hydrateCloudProgress({ uid })
  expect(isStageUnlocked('stage2', readFirebasePlayerProgress().records)).toBe(true)
  expect(readFirebasePlayerProgress().goldTotal).toBe(7)
})
