import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  getEliteBonusTextbookXp,
  getWavePhasesForStage,
  getBurstEventsForStage,
  randomSpawnPos,
  shouldDropTextbook,
  createDeathCollapseEntry,
  TEXTBOOK_DROP_RATE,
  WAVE_PHASES,
  pickTypeByWeightExcluding,
  formationSpawnPositions,
  waveSizeForPhase,
  getWaveSpawnSeconds,
  nextWaveInterval,
  stage2HpOverride,
  WAVE_INTERVAL_SEC,
  WAVE_INTERVAL_MIN_SEC,
  WAVE_INTERVAL_MAX_SEC,
} from './Enemies.jsx'
import { STAGE2_SPAWN_TELEGRAPHS } from '../lib/waveTimelines.js'
import { getBurstEventsForStage as burstsForStage } from '../lib/burstEvents.js'
import { ENEMY_STATS, getActiveE04ProjectileCount, resetActiveE04ProjectileCountForTest } from './Enemy.jsx'
import { playerPos } from '../lib/refs.js'
import { resolveRangedEnemyVelocity } from './Enemy.jsx'

describe('elite bonus rewards', () => {
  it('B01 bonus textbooks use explicit XP instead of B01 base XP 0', () => {
    expect(getEliteBonusTextbookXp('B01', 0)).toBe(40)
  })

  it('B02 stage 2 boss uses the same boss reward bucket', () => {
    expect(getEliteBonusTextbookXp('B02', 0)).toBe(40)
  })

  it('E06 bonus textbooks keep the existing enemy XP value', () => {
    expect(getEliteBonusTextbookXp('E06', 40)).toBe(40)
  })
})

describe('stage 1 E06 spawn pressure', () => {
  it('sets the stage 1 boss visual scale to two thirds of the previous size', () => {
    expect(ENEMY_STATS.B01.scale).toBe(2)
  })

  it('keeps the stage 2 boss at the same gameplay scale as stage 1 boss', () => {
    expect(ENEMY_STATS.B02.scale).toBe(2)
  })

  it('keeps the late giant zombie wave at three percent pressure', () => {
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
    expect(WAVE_PHASES.find((phase) => phase.start === 90).target).toBe(15)
    expect(WAVE_PHASES.find((phase) => phase.start === 108).target).toBe(19)
    expect(WAVE_PHASES.find((phase) => phase.start === 224).target).toBe(17)
  })

  it('reduces all stage 2 wave targets from 90 seconds onward to about two thirds', () => {
    const phases = getWavePhasesForStage('stage2')

    expect(phases.find((phase) => phase.start === 72).target).toBe(30)
    expect(phases.find((phase) => phase.start === 90).target).toBe(20)
    expect(phases.find((phase) => phase.start === 96).target).toBe(19)
    expect(phases.find((phase) => phase.start === 224).target).toBe(25)
  })

  it('reduces burst zombie counts after 90 seconds without removing boss events', () => {
    expect(getBurstEventsForStage('stage1').find((event) => event.sec === 108 && event.type === 'E01').count).toBe(5)
    expect(getBurstEventsForStage('stage1').find((event) => event.sec === 216 && event.type === 'E05').count).toBe(3)
    expect(getBurstEventsForStage('stage2').filter((event) => event.type === 'E04').map((event) => event.sec)).toEqual([72, 216])
    expect(getBurstEventsForStage('stage2').find((event) => event.sec === 216 && event.type === 'E05').count).toBe(3)
    expect(getBurstEventsForStage('stage1').find((event) => event.sec === 120 && event.type === 'B01').count).toBe(1)
    expect(getBurstEventsForStage('stage2').find((event) => event.sec === 120 && event.type === 'B02').count).toBe(1)
    expect(getBurstEventsForStage('stage2').some((event) => event.sec === 120 && event.type === 'B01')).toBe(false)
  })

  it('halves stage 2 E04 wave pressure while keeping total spawn targets stable', () => {
    const phases = getWavePhasesForStage('stage2')

    expect(phases.find((phase) => phase.start === 72).weights.E04).toBeCloseTo(0.075)
    expect(phases.find((phase) => phase.start === 96).weights.E04).toBeCloseTo(0.15)
    expect(phases.find((phase) => phase.start === 144).weights.E04).toBeCloseTo(0.14)
    expect(phases.find((phase) => phase.start === 168).weights.E04).toBeCloseTo(0.16)
    expect(phases.find((phase) => phase.start === 224).weights.E04).toBeCloseTo(0.12)
    phases.forEach((phase) => {
      expect(Object.values(phase.weights).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1)
    })
  })

  it('aligns stage 1 burst pressure with tutorial and relief windows', () => {
    const stage1Bursts = getBurstEventsForStage('stage1')

    expect(stage1Bursts.filter((event) => event.sec < 40).reduce((sum, event) => sum + event.count, 0)).toBe(24)
    expect(stage1Bursts.some((event) => event.type === 'E02' && event.sec < 60)).toBe(false)
    expect(stage1Bursts.some((event) => event.sec >= 90 && event.sec < 108)).toBe(false)
  })

  it('replaces capped E04 picks with the same phase non-E04 weights instead of forcing E03', () => {
    const originalRandom = Math.random
    Math.random = () => 0.99
    try {
      expect(pickTypeByWeightExcluding({ E02: 0.50, E04: 0.32, E06: 0.18 }, 'E04')).toBe('E06')
    } finally {
      Math.random = originalRandom
    }
  })
})

describe('random-interval discrete wave scheduler', () => {
  it('keeps the 20-40s interval band centered on the 30s average', () => {
    expect(WAVE_INTERVAL_MIN_SEC).toBe(20)
    expect(WAVE_INTERVAL_MAX_SEC).toBe(40)
    expect(WAVE_INTERVAL_SEC).toBe(30)
    // 균등분포 경계: random 0 → 20초, random 1 → 40초, random 0.5 → 30초.
    expect(nextWaveInterval(() => 0)).toBe(20)
    expect(nextWaveInterval(() => 1)).toBe(40)
    expect(nextWaveInterval(() => 0.5)).toBe(30)
  })

  it('fires the first wave at t=0 then accumulates random 20-40s gaps below the last phase end', () => {
    const lastEnd = WAVE_PHASES[WAVE_PHASES.length - 1].end
    // 결정적 random 시퀀스로 스케줄을 재현 — 첫 웨이브는 반드시 0.
    const rolls = [0, 0.5, 1, 0.25, 0.75, 0, 1, 0.5, 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const random = () => rolls[i++ % rolls.length]
    const secs = getWaveSpawnSeconds(WAVE_PHASES, random)

    expect(secs[0]).toBe(0)
    expect(Math.max(...secs)).toBeLessThan(lastEnd)
    // 인접 발화 간격은 항상 20~40초 범위 안.
    for (let k = 1; k < secs.length; k++) {
      const gap = secs[k] - secs[k - 1]
      expect(gap).toBeGreaterThanOrEqual(WAVE_INTERVAL_MIN_SEC)
      expect(gap).toBeLessThanOrEqual(WAVE_INTERVAL_MAX_SEC)
    }
  })

  it('bounds the wave count for a 240s stage between the min and max interval extremes', () => {
    const lastEnd = WAVE_PHASES[WAVE_PHASES.length - 1].end  // 240
    const maxWaves = getWaveSpawnSeconds(WAVE_PHASES, () => 0).length   // 20초 간격 → 최다
    const minWaves = getWaveSpawnSeconds(WAVE_PHASES, () => 1).length   // 40초 간격 → 최소
    expect(minWaves).toBe(Math.ceil(lastEnd / WAVE_INTERVAL_MAX_SEC))   // 6
    expect(maxWaves).toBe(Math.ceil(lastEnd / WAVE_INTERVAL_MIN_SEC))   // 12
    expect(minWaves).toBeLessThan(maxWaves)
  })

  it('spawns exactly round(target * 0.5) zombies per wave, minimum one', () => {
    // 첫 phase target 24 → 12마리. (사용자 확정: target 절반)
    expect(waveSizeForPhase({ target: 24 })).toBe(12)
    expect(waveSizeForPhase({ target: 34 })).toBe(17)
    expect(waveSizeForPhase({ target: 11 })).toBe(6)
    expect(waveSizeForPhase({ target: 1 })).toBe(1)
    // target 0/누락이어도 최소 1마리는 보장(빈 웨이브 방지).
    expect(waveSizeForPhase({ target: 0 })).toBe(1)
    expect(waveSizeForPhase(undefined)).toBe(1)
  })

  it('keeps stage 1 wave sizes in the expected 12-17 band for the dense phases', () => {
    WAVE_PHASES.filter((p) => p.target >= 24).forEach((p) => {
      const size = waveSizeForPhase(p)
      expect(size).toBeGreaterThanOrEqual(12)
      expect(size).toBeLessThanOrEqual(17)
    })
  })
})

describe('stage 2 total-HP relief (x0.8)', () => {
  it('scales every stage 2 combat enemy HP to 0.8x (rounded), boss included', () => {
    expect(stage2HpOverride('E02', 'stage2')).toEqual({ hp: Math.round(ENEMY_STATS.E02.hp * 0.8) })  // 70 -> 56
    expect(stage2HpOverride('E01', 'stage2')).toEqual({ hp: Math.round(ENEMY_STATS.E01.hp * 0.8) })  // 8 -> 6
    expect(stage2HpOverride('E06', 'stage2')).toEqual({ hp: Math.round(ENEMY_STATS.E06.hp * 0.8) })  // 320 -> 256
    expect(stage2HpOverride('B02', 'stage2')).toEqual({ hp: 920 })                                   // 1150 -> 920
  })

  it('leaves stage 1 untouched and ignores unknown types', () => {
    expect(stage2HpOverride('E02', 'stage1')).toBeUndefined()
    expect(stage2HpOverride('B01', 'stage1')).toBeUndefined()
    expect(stage2HpOverride('NOPE', 'stage2')).toBeUndefined()
  })

  it('leaves stage 3 at full HP (x1.0 — no relief override)', () => {
    // D4: stage3는 HP 완화 미적용(×1.0). override가 없어야 실효 +25%(스2 ×0.8 대비)가 성립.
    expect(stage2HpOverride('E02', 'stage3')).toBeUndefined()
    expect(stage2HpOverride('E06', 'stage3')).toBeUndefined()
    expect(stage2HpOverride('B01', 'stage3')).toBeUndefined()
    expect(stage2HpOverride('B02', 'stage3')).toBeUndefined()
  })
})

describe('stage 3 total-war wiring', () => {
  it('runs the stage3 total-war timeline with early-introduced E04/E05/E06', () => {
    const phases = getWavePhasesForStage('stage3')
    expect(phases).toHaveLength(12)
    expect(phases.find((p) => p.weights.E04).start).toBe(34)
    expect(phases.find((p) => p.weights.E05).start).toBe(52)
    expect(phases.find((p) => p.weights.E06).start).toBe(108)
  })

  it('revives formation bursts at runtime for stage3 (unlike stage1/stage2 boss-only)', () => {
    const runtime = getBurstEventsForStage('stage3')
    // 형태 버스트가 데이터에 존재하고 런타임 목록에도 남는다(스폰 엔진이 formation 분기 처리).
    expect(runtime.some((e) => e.formation)).toBe(true)
    // 더블 보스가 스태거로 두 개(B02 135 / B01 147).
    const bosses = runtime.filter((e) => e.type === 'B01' || e.type === 'B02')
    expect(bosses.map((e) => e.sec).sort((a, b) => a - b)).toEqual([135, 147])
  })
})

describe('enemy spawn placement', () => {
  it('resamples hallway spawns instead of clamping a crowd onto one boundary line', () => {
    playerPos.x = 0
    playerPos.z = 0
    const rolls = [0.25, 1, 0, 1]
    const random = () => rolls.shift() ?? 0

    const pos = randomSpawnPos('E01', { halfX: 6, halfZ: 48 }, [], random)

    expect(pos[0]).toBeCloseTo(0)
    expect(pos[2]).toBeCloseTo(6.5)
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

describe('formation spawns', () => {
  const bounds = { halfX: 7.5, halfZ: 19.2 }  // stage2 복도
  const player = { x: 0, z: 0 }
  const SPAWN_INSET = 1.5
  const inBounds = (pos) =>
    Math.abs(pos[0]) <= bounds.halfX - SPAWN_INSET + 1e-6 &&
    Math.abs(pos[2]) <= bounds.halfZ - SPAWN_INSET + 1e-6

  it('returns exactly count positions inside spawn bounds for every formation', () => {
    for (const formation of ['swarm', 'ring', 'pincer', 'column', 'gauntlet']) {
      const positions = formationSpawnPositions(formation, 6, bounds, player, () => 0.5)
      expect(positions).toHaveLength(6)
      positions.forEach((pos) => expect(inBounds(pos)).toBe(true))
    }
  })

  it('spawns a swarm at the corridor end far from the player', () => {
    const near = formationSpawnPositions('swarm', 4, bounds, { x: 0, z: 15 }, () => 0)
    near.forEach((pos) => expect(pos[2]).toBeLessThan(0))  // 플레이어가 +Z 근처면 -Z 끝에서 등장
  })

  it('stacks a column into multiple Z rows so it reads as a marching block', () => {
    const positions = formationSpawnPositions('column', 9, bounds, player, () => 0.5)
    const distinctRows = new Set(positions.map((pos) => Math.round(pos[2] * 100) / 100))
    expect(distinctRows.size).toBeGreaterThanOrEqual(2)  // 여러 Z-행 = 밀집 블록
    // 블록 폭은 벽까지 꽉 채우지 않는다(swarm의 느슨한 한 줄과 구분).
    const maxAbsX = Math.max(...positions.map((pos) => Math.abs(pos[0])))
    expect(maxAbsX).toBeLessThan(bounds.halfX - SPAWN_INSET)
  })

  it('lines a gauntlet along both walls with a runnable gap down the middle', () => {
    const positions = formationSpawnPositions('gauntlet', 8, bounds, player, () => 0.5)
    const left = positions.filter((pos) => pos[0] < 0)
    const right = positions.filter((pos) => pos[0] > 0)
    expect(left.length).toBeGreaterThan(0)
    expect(right.length).toBeGreaterThan(0)
    // 두 줄 모두 벽 쪽(큰 |x|)에 붙어 가운데가 비어야 한다.
    positions.forEach((pos) => expect(Math.abs(pos[0])).toBeGreaterThan(bounds.halfX - SPAWN_INSET - 1.5))
  })

  it('does not telegraph retired formation bursts', () => {
    expect(STAGE2_SPAWN_TELEGRAPHS).toEqual([])
    expect(burstsForStage('stage2').some((evt) => evt.formation)).toBe(true)
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

  it('passes through a forced shatter style for explosive weapon kills', () => {
    const entry = createDeathCollapseEntry(99, {
      type: 'E01',
      pos: [1, 0.2, 2],
      visualScale: 0.5,
      intensity: 'strong',
      styleOverride: 'shatter5',
    })

    expect(entry.styleOverride).toBe('shatter5')
  })
})

describe('enemy spawn audio ownership', () => {
  it('lets Enemy own Matilda and boss spawn sounds so each spawn plays once', () => {
    const enemiesSource = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    const enemySource = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')

    expect(enemiesSource).not.toContain("emitSfx({ id: 'matildaSpawn' })")
    expect(enemiesSource).not.toContain("emitSfx({ id: 'bossSpawn' })")
    expect(enemySource).toContain('emitEnemySpawnSfx(type, isMatilda)')
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

  it('uses one global E04 projectile budget and suppresses E04 fire for the full boss phase', () => {
    resetActiveE04ProjectileCountForTest()
    expect(getActiveE04ProjectileCount()).toBe(0)

    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    expect(source).toContain("activeProjectileCount: type === 'E04' ? getActiveE04ProjectileCount() : projectiles.length")
    expect(source).toContain('registerE04Projectile(projectileId)')
    expect(source).toContain('const bossPressureStartSec = stageConfig.bossWarningSec ?? 120')
    expect(source).toContain('const bossPressureEndSec = stageConfig.escapePortalSec ?? 150')
    expect(source).toContain('bossPressure: elapsedSec >= bossPressureStartSec && elapsedSec < bossPressureEndSec')
  })
})
