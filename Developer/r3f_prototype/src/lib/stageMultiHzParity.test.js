import { describe, expect, it } from 'vitest'
import {
  MULTI_HZ_CHECKPOINT_SECONDS,
  MULTI_HZ_RENDER_RATES,
  MULTI_HZ_STAGE_IDS,
  runFrameDeltaClampProbe,
  runStageMultiHzParity,
} from './stageMultiHzParity.js'

describe('Stage 1~4 deterministic multi-Hz parity (pure simulation harness)', () => {
  it('runs the same seeded 240 second input log at 30/60/120 Hz with exact fixed-step checkpoints', () => {
    const startedAt = performance.now()
    const result = runStageMultiHzParity()
    expect(result.ok).toBe(true)
    expect(result.failures).toEqual([])
    expect(performance.now() - startedAt).toBeLessThan(10_000)

    for (const stageId of MULTI_HZ_STAGE_IDS) {
      for (const renderHz of MULTI_HZ_RENDER_RATES) {
        const run = result.results[stageId][renderHz]
        expect(run.ok).toBe(true)
        expect(run.fixedSteps).toBe(14_400)
        expect(run.checkpoints).toHaveLength(MULTI_HZ_CHECKPOINT_SECONDS.length)
        expect(run.final.eventDropped).toBe(0)
        expect(run.final.nanCount).toBe(0)
        expect(run.final.invariantOk).toBe(true)
        expect(run.stats.contacts).toBeGreaterThan(0)
        expect(run.cleanup).toEqual({
          activeEnemies: 0,
          liveProxies: 0,
          activeProjectiles: 0,
          eventDropped: 0,
          nanCount: 0,
          invariantOk: true,
        })
      }
    }
    const allRuns = Object.values(result.results).flatMap((rates) => Object.values(rates))
    expect(allRuns.some((run) => run.stats.rangedFires > 0 && run.stats.projectileSpawns > 0)).toBe(true)
    expect(allRuns.some((run) => run.stats.despawns > 0)).toBe(true)
  })

  it('keeps the production 0.5 second clamp and 120 Hz residual behavior separate from parity', () => {
    expect(runFrameDeltaClampProbe()).toMatchObject({
      clampedDelta: 0.5,
      maxDelta: 0.5,
      cappedSteps: 30,
      first120: 0,
      second120: 1,
      ok: true,
    })
  })
})
