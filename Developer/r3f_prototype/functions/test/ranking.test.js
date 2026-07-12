import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyRunSubmission,
  buildPublicEntry,
  getKstRankingKeys,
  normalizeRun,
} from '../src/ranking.js'

test('normalizes the limited ranking run payload', () => {
  assert.deepEqual(
    normalizeRun({ runId: 'run_20260712_001', stageId: 'stage2', score: 840, timeMs: 95000, cleared: true }),
    { runId: 'run_20260712_001', stageId: 'stage2', score: 840, timeMs: 95000, cleared: true },
  )
})

test('rejects payloads that exceed the server-side ranking limits', () => {
  assert.throws(() => normalizeRun({ runId: 'x', stageId: 'stage2', score: 1 }))
  assert.throws(() => normalizeRun({ runId: 'run_20260712_001', stageId: 'boss', score: 1 }))
  assert.throws(() => normalizeRun({ runId: 'run_20260712_001', stageId: 'stage2', score: 100001 }))
})

test('uses Korean day and Monday-based week keys', () => {
  assert.deepEqual(getKstRankingKeys(Date.parse('2026-07-12T14:59:59.000Z')), {
    daily: '2026-07-12',
    weekly: '2026-07-06',
  })
  assert.deepEqual(getKstRankingKeys(Date.parse('2026-07-12T15:00:01.000Z')), {
    daily: '2026-07-13',
    weekly: '2026-07-13',
  })
})

test('creates a public row without a Firebase UID', () => {
  const row = buildPublicEntry({ displayName: '학생A', score: 1200, timeMs: 15000, cleared: false, updatedAt: 1 })
  assert.deepEqual(row, {
    displayName: '학생A',
    score: 1200,
    timeMs: 15000,
    cleared: false,
    updatedAt: 1,
  })
  assert.equal(Object.hasOwn(row, 'uid'), false)
})

test('records one run once and atomically projects daily, weekly, and stage daily totals', () => {
  const args = {
    uid: 'google-user-123',
    displayName: '학생A',
    run: normalizeRun({ runId: 'run_20260712_001', stageId: 'stage2', score: 840, timeMs: 95000, cleared: true }),
    seasonId: 'season-001',
    nowMs: Date.parse('2026-07-12T08:00:00.000Z'),
  }
  const first = applyRunSubmission(null, args)
  const key = Object.keys(first.state.public['season-001'].global.daily['2026-07-12'].entries)[0]
  const publicData = first.state.public['season-001']

  assert.equal(first.duplicate, false)
  assert.deepEqual(publicData.global.daily['2026-07-12'].entries[key], {
    displayName: '학생A', score: 840, timeMs: 95000, cleared: true, updatedAt: args.nowMs,
  })
  assert.equal(publicData.global.weekly['2026-07-06'].entries[key].score, 840)
  assert.equal(publicData.stage.stage2.daily['2026-07-12'].entries[key].score, 840)
  assert.equal(Object.hasOwn(publicData.global.daily['2026-07-12'].entries[key], 'uid'), false)

  const duplicate = applyRunSubmission(first.state, args)
  assert.equal(duplicate.duplicate, true)
  assert.equal(duplicate.state.public['season-001'].global.daily['2026-07-12'].entries[key].score, 840)
})
