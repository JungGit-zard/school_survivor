import { describe, it, expect, vi } from 'vitest'
import { createHash } from 'node:crypto'

const isolated = vi.hoisted(() => ({ clock: { elapsedMs: 0, lastPublishedMs: 0 }, writes: 0 }))
// Actual store/reducers; only external effects and shared runtime objects are isolated.
vi.mock('./firebaseProgress.js', async (importOriginal) => {
  const actual = await importOriginal()
  const forbidden = () => { isolated.writes += 1; throw new Error('External progress access forbidden') }
  return { ...actual,
    isFirebaseProgressHydrated: () => false,
    isFirebaseProgressConfigured: () => false,
    getFirebaseProgressRuntimeSnapshot: () => ({ uid: null }),
    readFirebasePlayerProgress: () => actual.readFirebasePlayerProgress(),
    readFirebaseMissionProgress: () => ({ ok: false, reason: 'isolated' }),
    updateFirebasePlayerProgress: forbidden,
    updateFirebaseMissionProgress: forbidden,
    saveFirebaseMissionProgress: forbidden,
    requestCloudProgressSave: forbidden,
    recordPlayActivity: forbidden,
  }
})
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: { getState: () => ({ user: null }) } }))
vi.mock('./firebaseRanking.js', () => ({ submitRun: () => { throw new Error('Ranking write forbidden') }, describeSubmission: () => '' }))
vi.mock('./gameRuntimeTime.js', () => ({
  getRuntimeElapsedMs: (storeMs = 0) => Math.max(isolated.clock.elapsedMs, storeMs),
  advanceRuntimeTime: (delta) => (isolated.clock.elapsedMs += delta),
  setRuntimeElapsedMs: (ms) => (isolated.clock.elapsedMs = ms),
  resetRuntimeTime: () => { isolated.clock = { elapsedMs: 0, lastPublishedMs: 0 } },
  isRuntimeTimePublishDue: () => isolated.clock.elapsedMs - isolated.clock.lastPublishedMs >= 100,
  markRuntimeTimePublished: () => (isolated.clock.lastPublishedMs = isolated.clock.elapsedMs),
}))
vi.mock('./refs.js', () => ({ playerPos: { x: 0, y: 0, z: 0 }, resetRuntimeRefs: () => { isolated.clock = { elapsedMs: 0, lastPublishedMs: 0 } } }))
vi.mock('./pickup.js', () => ({ setMagnetMultiplier: () => {} }))
// A fully unlocked synthetic account exercises real acquisition/replacement
// logic without changing any user's durable weapon unlocks.
vi.mock('./weaponUnlocks.js', () => ({ isUnlocked: () => true, getAllUnlocked: () => new Set(), setUnlocked: () => { throw new Error('Unlock persistence forbidden') } }))
vi.mock('./sfxEvents.js', () => ({ emitSfx: () => {} }))
vi.mock('./playtestLogger.js', () => ({ logDamageTaken: () => {} }))
vi.mock('./damageNumbers.js', () => ({ emitDamageNumber: () => {}, DAMAGE_NUMBER_COLORS: { player: '#fff' } }))

import { useGameStore } from '../store/useGameStore.js'
import { buildCloudProgressSnapshot } from './firebaseProgress.js'
import { runGameplayStateVerifier as verify, formatGameplayStateFailure } from './gameplayStateVerifier.js'
const runtimeBoundary = {
  snapshot: () => ({ ...isolated.clock }),
  restore: (snapshot) => { isolated.clock = { ...snapshot } },
}
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
function runGameplayStateVerifier(options) {
  const before = useGameStore.getState()
  const beforeJson = JSON.stringify(before)
  const beforeHash = hash(before)
  const clock = { ...isolated.clock }
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const capturedAt = new Date().toISOString()
  const capturedAtMs = Date.parse(capturedAt)
  const firebaseSnapshot = buildCloudProgressSnapshot(capturedAtMs)
  const firebaseHash = hash(firebaseSnapshot)
  try { return verify({ ...options, runtimeBoundary }) } finally {
    expect(useGameStore.getState()).toBe(before)
    expect(JSON.stringify(useGameStore.getState())).toBe(beforeJson)
    expect(hash(useGameStore.getState())).toBe(beforeHash)
    expect(isolated.clock).toEqual(clock)
    expect(Object.getOwnPropertyDescriptor(globalThis, 'localStorage')).toEqual(descriptor)
    expect(isolated.writes).toBe(0)
    expect(buildCloudProgressSnapshot(capturedAtMs)).toEqual(firebaseSnapshot)
    expect(hash(buildCloudProgressSnapshot(capturedAtMs))).toBe(firebaseHash)
    console.log('[state-restoration]', JSON.stringify({ capturedAt, sha256: beforeHash, firebaseFixtureSha256: firebaseHash, equal: true }))
  }
}

const FULL_RUNS = Number(process.env.STATE_VERIFIER_RUNS ?? 20000)

describe('헤드리스 게임 상태 검증기', () => {
  it('예외와 불변식 실패에서도 최초 상태를 복원한다', () => {
    const original = useGameStore.getState()
    try {
      useGameStore.setState({ resetGame: () => { throw new Error('injected failure') } })
      expect(() => runGameplayStateVerifier({ runs: 1 })).toThrow('injected failure')
      useGameStore.setState({ ...original, resetGame: () => useGameStore.setState({ phase: 'invalid-phase' }) }, true)
      expect(runGameplayStateVerifier({ runs: 1 }).ok).toBe(false)
    } finally { useGameStore.setState(original, true) }
  })
  it('같은 seed는 같은 digest와 통계를 재현한다', () => {
    const first = runGameplayStateVerifier({ runs: 250, seed: 0x5a17e001, maxActionsPerRun: 18 })
    const second = runGameplayStateVerifier({ runs: 250, seed: 0x5a17e001, maxActionsPerRun: 18 })

    expect(first.ok, formatGameplayStateFailure(first.failure)).toBe(true)
    expect(second.ok, formatGameplayStateFailure(second.failure)).toBe(true)
    expect(second.digest).toBe(first.digest)
    expect(second.stats).toEqual(first.stats)
  })

  it('2만 판 이상을 5분 예산 안에서 상태 불변식 위반 없이 실행한다', () => {
    const started = performance.now()
    const result = runGameplayStateVerifier({ runs: FULL_RUNS, seed: 0xaaa07e74, maxActionsPerRun: 36 })
    const elapsedMs = performance.now() - started

    console.log('[gameplay-state-verifier]', JSON.stringify({
      runs: result.runs,
      digest: result.digest,
      elapsedMs: Math.round(elapsedMs),
      stats: result.stats,
    }))

    expect(result.ok, formatGameplayStateFailure(result.failure)).toBe(true)
    expect(result.runs).toBeGreaterThanOrEqual(20000)
    expect(result.failure).toBeNull()
    expect(elapsedMs).toBeLessThan(5 * 60 * 1000)
    expect(result.stats.stage1Runs).toBeGreaterThan(0)
    expect(result.stats.stage2Runs).toBeGreaterThan(0)
    expect(result.stats.stage3Runs).toBeGreaterThan(0)
    expect(result.stats.stage4Runs).toBeGreaterThan(0)
    expect(result.stats.levelUps).toBeGreaterThan(0)
    expect(result.stats.upgradesApplied).toBeGreaterThan(0)
    for (const stat of ['gameovers', 'clears', 'nextStageTransitions', 'replacementsConfirmed', 'replacementsDiscarded']) expect(result.stats[stat]).toBeGreaterThan(0)
    expect(result.stats.localStorageTouches).toBe(0)
  }, 5 * 60 * 1000)
})
