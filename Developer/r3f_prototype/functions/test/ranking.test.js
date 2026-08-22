import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyRunSubmission,
  buildPublicEntry,
  getKstRankingKeys,
  maxLegitScore,
  normalizeRun,
} from '../src/ranking.js'

test('normalizes the limited ranking run payload', () => {
  assert.deepEqual(
    normalizeRun({ runId: 'run_20260712_001', stageId: 'stage2', score: 379, timeMs: 240000, cleared: true }),
    { runId: 'run_20260712_001', stageId: 'stage2', score: 379, timeMs: 240000, cleared: true },
  )
})

test('accepts stage3 and stage4 submissions (B1: server whitelist)', () => {
  // stage3 clear 240s: base = 240 + 120 + 30 = 390, +escape floor(390*0.15)=58 -> 448
  assert.doesNotThrow(() =>
    normalizeRun({ runId: 'run_stage3_0001', stageId: 'stage3', score: 448, timeMs: 240000, cleared: true }),
  )
  // stage4 clear 240s: base = 240 + 180 + 30 = 450, +escape floor(450*0.15)=67 -> 517
  assert.doesNotThrow(() =>
    normalizeRun({ runId: 'run_stage4_0001', stageId: 'stage4', score: 517, timeMs: 240000, cleared: true }),
  )
})

test('rejects payloads that exceed the server-side ranking limits', () => {
  assert.throws(() => normalizeRun({ runId: 'x', stageId: 'stage2', score: 1 }))
  assert.throws(() => normalizeRun({ runId: 'run_20260712_001', stageId: 'boss', score: 1 }))
  assert.throws(() => normalizeRun({ runId: 'run_20260712_001', stageId: 'stage2', score: 100001 }))
})

test('rejects tampered scores above the honest per-run maximum (M5)', () => {
  // stage2, 95s, cleared: max = (95+60+30) + floor(185*0.15)=27 -> 212. 840 is impossible.
  assert.throws(
    () => normalizeRun({ runId: 'run_cheat_0001', stageId: 'stage2', score: 840, timeMs: 95000, cleared: true }),
    /server revalidation/,
  )
  // stage1 non-clear: stageBonus 0, so any score above survival seconds is a cheat.
  assert.throws(
    () => normalizeRun({ runId: 'run_cheat_0002', stageId: 'stage1', score: 500, timeMs: 100000, cleared: false }),
    /server revalidation/,
  )
  // score below survival seconds is also rejected.
  assert.throws(
    () => normalizeRun({ runId: 'run_cheat_0003', stageId: 'stage1', score: 10, timeMs: 100000, cleared: false }),
    /server revalidation/,
  )
})

test('accepts the exact honest maximum score for each stage (M5 boundary)', () => {
  assert.equal(maxLegitScore('stage1', 100000, false), 100) // survival only
  assert.equal(maxLegitScore('stage4', 240000, true), 517)
  assert.doesNotThrow(() =>
    normalizeRun({ runId: 'run_stage1_edge0', stageId: 'stage1', score: 100, timeMs: 100000, cleared: false }),
  )
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

test('records one run once and atomically projects daily, weekly, stage-daily, and stage-weekly totals', () => {
  const args = {
    uid: 'google-user-123',
    displayName: '학생A',
    run: normalizeRun({ runId: 'run_20260712_001', stageId: 'stage2', score: 379, timeMs: 240000, cleared: true }),
    seasonId: 'season-001',
    nowMs: Date.parse('2026-07-12T08:00:00.000Z'),
  }
  const first = applyRunSubmission(null, args)
  const key = Object.keys(first.state.public['season-001'].global.daily['2026-07-12'].entries)[0]
  const publicData = first.state.public['season-001']

  assert.equal(first.duplicate, false)
  assert.deepEqual(publicData.global.daily['2026-07-12'].entries[key], {
    displayName: '학생A', score: 379, timeMs: 240000, cleared: true, updatedAt: args.nowMs,
  })
  assert.equal(publicData.global.weekly['2026-07-06'].entries[key].score, 379)
  assert.equal(publicData.stage.stage2.daily['2026-07-12'].entries[key].score, 379)
  // L8: stage-scoped weekly board is now projected too.
  assert.equal(publicData.stage.stage2.weekly['2026-07-06'].entries[key].score, 379)
  assert.equal(Object.hasOwn(publicData.global.daily['2026-07-12'].entries[key], 'uid'), false)

  // M6: re-submitting the same runId is deduped — totals do not double.
  const duplicate = applyRunSubmission(first.state, args)
  assert.equal(duplicate.duplicate, true)
  assert.equal(duplicate.state.public['season-001'].global.daily['2026-07-12'].entries[key].score, 379)
  assert.equal(duplicate.state.public['season-001'].stage.stage2.weekly['2026-07-06'].entries[key].score, 379)
})
