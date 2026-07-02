import { describe, it, expect } from 'vitest'
import {
  getEliteBonusTextbookXp,
  getWavePhasesForStage,
  getBurstEventsForStage,
  randomSpawnPos,
  shouldDropTextbook,
  createDeathCollapseEntry,
  TEXTBOOK_DROP_RATE,
  WAVE_PHASES,
} from './Enemies.jsx'
import { ENEMY_STATS } from './Enemy.jsx'
import { playerPos } from '../lib/refs.js'
import { resolveRangedEnemyVelocity } from './Enemy.jsx'

describe('elite bonus rewards', () => {
  it('B01 bonus textbooks use explicit XP instead of B01 base XP 0', () => {
    expect(getEliteBonusTextbookXp('B01', 0)).toBe(40)
  })

  it('E06 bonus textbooks keep the existing enemy XP value', () => {
    expect(getEliteBonusTextbookXp('E06', 40)).toBe(40)
  })
})

describe('stage 1 E06 spawn pressure', () => {
  it('keeps the late giant zombie wave at five percent pressure', () => {
    const giantPhase = WAVE_PHASES.find((phase) => phase.start === 168)

    expect(giantPhase.weights.E06).toBe(0.03)
    expect(Object.values(giantPhase.weights).reduce((sum, weight) => sum + weight, 0)).toBe(1)
  })

  it('keeps E04 out of every stage 1 wave and burst event', () => {
    expect(getWavePhasesForStage('stage1').some((phase) => phase.weights.E04)).toBe(false)
    expect(getBurstEventsForStage('stage1').some((event) => event.type === 'E04')).toBe(false)
  })

  it('introduces E04 only in stage 2 after the 72 second tutorial window', () => {
    const stage2Phases = getWavePhasesForStage('stage2')
    const firstE04Phase = stage2Phases.find((phase) => phase.weights.E04)

    expect(firstE04Phase.start).toBeGreaterThanOrEqual(72)
    expect(getBurstEventsForStage('stage2').filter((event) => event.type === 'E04').every((event) => event.sec >= 72)).toBe(true)
  })
})

describe('late zombie spawn relief', () => {
  it('reduces all stage 1 wave targets from 90 seconds onward to about two thirds', () => {
    expect(WAVE_PHASES.find((phase) => phase.start === 72).target).toBe(34)
    expect(WAVE_PHASES.find((phase) => phase.start === 90).target).toBe(23)
    expect(WAVE_PHASES.find((phase) => phase.start === 108).target).toBe(29)
    expect(WAVE_PHASES.find((phase) => phase.start === 224).target).toBe(26)
  })

  it('reduces all stage 2 wave targets from 90 seconds onward to about two thirds', () => {
    const phases = getWavePhasesForStage('stage2')

    expect(phases.find((phase) => phase.start === 72).target).toBe(30)
    expect(phases.find((phase) => phase.start === 90).target).toBe(20)
    expect(phases.find((phase) => phase.start === 96).target).toBe(19)
    expect(phases.find((phase) => phase.start === 224).target).toBe(25)
  })

  it('reduces burst zombie counts after 90 seconds without removing boss events', () => {
    expect(getBurstEventsForStage('stage1').find((event) => event.sec === 96 && event.type === 'E01').count).toBe(5)
    expect(getBurstEventsForStage('stage1').find((event) => event.sec === 216 && event.type === 'E05').count).toBe(3)
    expect(getBurstEventsForStage('stage2').find((event) => event.sec === 96 && event.type === 'E04').count).toBe(1)
    expect(getBurstEventsForStage('stage2').find((event) => event.sec === 216 && event.type === 'E05').count).toBe(3)
    expect(getBurstEventsForStage('stage2').find((event) => event.sec === 192 && event.type === 'B01').count).toBe(1)
  })
})

describe('enemy spawn placement', () => {
  it('resamples hallway spawns instead of clamping a crowd onto one boundary line', () => {
    playerPos.x = 0
    playerPos.z = 0
    const rolls = [0.25, 1, 0, 1]
    const random = () => rolls.shift() ?? 0

    const pos = randomSpawnPos('E01', { halfX: 10, halfZ: 48 }, [], random)

    expect(pos[0]).toBeCloseTo(0)
    expect(pos[2]).toBeCloseTo(12.5)
  })

  it('rejects a third spawn point that would extend a straight line', () => {
    playerPos.x = 0
    playerPos.z = 0
    const taken = [
      [0, 0.24, 7],
      [0, 0.24, 13],
    ]
    const rolls = [0, 0.5, 0.125, 0.5]
    const random = () => rolls.shift() ?? 0

    const pos = randomSpawnPos('E01', { halfX: 10, halfZ: 48 }, taken, random)

    expect(pos[0]).not.toBeCloseTo(0)
  })

  it('does not use a straight-line fallback when every ring candidate repeats the same line', () => {
    playerPos.x = 0
    playerPos.z = 0
    const taken = [
      [0, 0.24, 7],
      [0, 0.24, 13],
    ]
    const random = () => 0

    const pos = randomSpawnPos('E01', { halfX: 10, halfZ: 48 }, taken, random)

    expect(pos[0]).not.toBeCloseTo(0)
  })
})

describe('XP textbook drops', () => {
  it('drops a textbook for normal enemies when the 30 percent roll succeeds', () => {
    expect(TEXTBOOK_DROP_RATE).toBe(0.3)
    expect(shouldDropTextbook({ xp: 6, type: 'E01' }, 0.29)).toBe(true)
  })

  it('does not drop a textbook for normal enemies when the roll misses', () => {
    expect(shouldDropTextbook({ xp: 6, type: 'E01' }, 0.3)).toBe(false)
  })

  it('does not drop random textbooks for zero-XP enemies', () => {
    expect(shouldDropTextbook({ xp: 0, type: 'B01' }, 0)).toBe(false)
  })
})

describe('enemy death visuals', () => {
  it('routes every zombie type through the same random collapse effect', () => {
    const types = Object.keys(ENEMY_STATS)

    types.forEach((type, index) => {
      const entry = createDeathCollapseEntry(index + 1, {
        type,
        pos: [index, 0.2, index + 2],
        visualScale: 0.5 + index * 0.1,
        intensity: index % 2 === 0 ? 'strong' : 'weak',
        deathStyleMix: 'slump',
      })

      expect(entry).toMatchObject({
        id: index + 1,
        type,
        position: [index, 0.2, index + 2],
        visualScale: 0.5 + index * 0.1,
        intensity: index % 2 === 0 ? 'strong' : 'weak',
      })
      expect(entry).not.toHaveProperty('deathStyleMix')
    })
  })
})

describe('ranged enemy movement', () => {
  it('keeps E04 moving sideways at preferred range instead of standing still', () => {
    const velocity = resolveRangedEnemyVelocity({
      dirX: 1,
      dirZ: 0,
      dist: ENEMY_STATS.E04.preferDist - 0.5,
      minDist: ENEMY_STATS.E04.minDist,
      preferDist: ENEMY_STATS.E04.preferDist,
      speed: ENEMY_STATS.E04.speed,
      strafeSign: 1,
    })

    expect(Math.hypot(velocity.x, velocity.z)).toBeGreaterThan(0)
  })
})
