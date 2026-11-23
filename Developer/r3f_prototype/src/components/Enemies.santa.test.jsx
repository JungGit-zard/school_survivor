import { beforeAll, describe, expect, it } from 'vitest'
import { getSantaRuntimeEvents } from '../lib/santaEvent.js'
import { getRuntimeSpawnEventsForStage } from '../lib/burstEvents.js'

// Enemies.jsx 모듈 그래프 첫 로드는 준비 비용이라 beforeAll(넉넉한 제한)로 뺀다(Enemies.stage5.test.jsx와 같은 이유).
let enemiesModule
let enemyModule
beforeAll(async () => {
  enemiesModule = await import('./Enemies.jsx')
  enemyModule = await import('./Enemy.jsx')
}, 120_000)

describe('Christmas santa zombies in the Enemies runtime', () => {
  it('drops exactly 2 gold coins and no textbook for both santa types', () => {
    const { ELITE_BONUS } = enemiesModule
    expect(ELITE_BONUS.XSG).toEqual({ textbook: 0, gold: 2 })
    expect(ELITE_BONUS.XSL).toEqual({ textbook: 0, gold: 2 })
    // E08 stays as it was.
    expect(ELITE_BONUS.E08).toEqual({ textbook: 0, gold: 10 })
  })

  it('registers both santa types as pooled enemies with stats', () => {
    const { isPooledEnemyType } = enemiesModule
    const { ENEMY_STATS } = enemyModule
    expect(isPooledEnemyType('XSG')).toBe(true)
    expect(isPooledEnemyType('XSL')).toBe(true)
    expect(ENEMY_STATS.XSG).toMatchObject({ hp: 16, damage: 0 })
    expect(ENEMY_STATS.XSL).toMatchObject({ hp: 60, damage: ENEMY_STATS.RZC.damage, speed: ENEMY_STATS.RZC.speed, runCrew: true })
  })

  it('starts the sleigh just above the top screen edge in a lane near Rosari, heading down like the run crew', () => {
    const { createSantaSleighEntry, RUN_ZOMBIE_CREW_DIR, RUN_ZOMBIE_CREW_LANE_SPREAD } = enemiesModule
    const bounds = { halfX: 10, halfZ: 14.4 }
    const view = { minX: -4, maxX: 4, minZ: -8, maxZ: 6 }
    for (const roll of [0, 0.5, 0.999]) {
      const entry = createSantaSleighEntry(bounds, () => roll, { x: 1, z: 2 }, view)
      expect(entry.type).toBe('XSL')
      expect(entry.runCrewDir).toBe(RUN_ZOMBIE_CREW_DIR)
      expect(entry.pos[2]).toBeLessThan(view.minZ)
      expect(Math.abs(entry.pos[0] - 1)).toBeLessThanOrEqual(RUN_ZOMBIE_CREW_LANE_SPREAD + 1e-9)
    }
  })

  it('keeps the run crew spawn identical after sharing its start point with the sleigh', () => {
    const { createRunZombieCrewEntries, runZombieCrewLeaderStart } = enemiesModule
    const bounds = { halfX: 7.5, halfZ: 19.2 }
    const view = { minX: -4, maxX: 4, minZ: -8, maxZ: 6 }
    const crew = createRunZombieCrewEntries(bounds, () => 0.25, [], { x: 0.5, z: 0 }, view)
    const start = runZombieCrewLeaderStart(bounds, () => 0.25, { x: 0.5, z: 0 }, view)
    expect(crew[0].type).toBe('RZL')
    expect(crew[0].pos[0]).toBeCloseTo(start.x, 9)
    expect(crew[0].pos[2]).toBeCloseTo(start.z, 9)
    expect(crew).toHaveLength(13)
  })

  it('does not let empty-field catch-up jump the spawn clock to a santa row', () => {
    const { nextPendingSpawnSec } = enemiesModule
    const events = [{ sec: 50, type: 'E01', count: 1 }, ...getSantaRuntimeEvents('stage1', new Date(2026, 11, 1))]
    const fired = new Uint8Array(16)
    const repeats = new Int16Array(16).fill(-1)
    // At 45 s the next santa row (47 s) is earlier than the E01 row (50 s) but must be ignored.
    expect(nextPendingSpawnSec(events, fired, repeats, 45, 'stage1')).toBe(50)
  })

  it('appends the santa rows to the run cache only through getSantaRuntimeEvents', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    expect(source).toContain('burstEvents: getRuntimeSpawnEventsForStage(currentStageId).concat(getSantaRuntimeEvents(currentStageId))')
    // The base table never carries santa rows by itself.
    expect(getRuntimeSpawnEventsForStage('stage1').some((e) => e.type === 'XSG' || e.type === 'XSL')).toBe(false)
  })
})
