import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  getEliteBonusTextbookXp,
  getWavePhasesForStage,
  getBurstEventsForStage,
  randomSpawnPos,
  enemySpawnRadius,
  spawnOverlapsObstacle,
  shouldDropTextbook,
  createDeathCollapseEntry,
  TEXTBOOK_DROP_RATE,
  WAVE_PHASES,
  pickTypeByWeightExcluding,
  formationSpawnPositions,
  createRunZombieCrewEntries,
  createStage2GuardChaseEntries,
  pickMixedReinforcementTypes,
  spawnPosForBurstType,
  RUN_ZOMBIE_CREW_SIZE,
  RUN_ZOMBIE_CREW_DIR,
  STAGE2_GUARD_CHASE_SIZE,
  waveSizeForPhase,
  rawWaveSizeForStage,
  waveSizeForStageAtTime,
  stageExpectedBaseJarmobHp,
  stageExpectedJarmobHp,
  stageBurstJarmobBaseHp,
  stageRunCrewFixedHp,
  stage2GuardChaseFixedHp,
  stageJarmobLoadWindows,
  STAGE_JARMOB_HP_MULTIPLIER,
  STAGE_DENSITY_MULTIPLIER,
  STAGE2_SAME_TYPE_HP_MULTIPLIER,
  sameTypeZombieHpForStage,
  STAGE2_SPAWN_MULTIPLIER,
  STAGE2_OPENING_GREEN_WAVE_MULTIPLIER,
  getWaveSpawnSeconds,
  nextWaveInterval,
  nextWaveTimeForStage,
  firstWaveTimeForStage,
  midWaveTimeForStage,
  rawMidWaveSize,
  midWaveSizeForStage,
  MID_WAVE_STAGES,
  getMidpointSpawnSeconds,
  bossEscortSize,
  stageHpOverride,
  WAVE_INTERVAL_SEC,
  WAVE_INTERVAL_MIN_SEC,
  WAVE_INTERVAL_MAX_SEC,
  STAGE1_SPAWN_MULTIPLIER,
  DOGE_SPAWN_SEC,
  DOGE_SPAWN_POS,
  DOGE_SCALE,
  DOGE_BASE_HP,
  DOGE_COIN_COUNT,
  dogeHpForStage,
  shouldSpawnDoge,
  dogeTreasureCoinPositions,
  isPooledEnemyType,
  shouldScheduleBurst,
  OVERTIME_REINFORCEMENT_START_SEC,
  OVERTIME_REINFORCEMENT_INTERVAL_SEC,
  OVERTIME_REINFORCEMENT_COUNT,
  MAX_CONCURRENT_ZOMBIES,
  overtimeReinforcementTick,
  shouldScheduleOvertimeReinforcement,
  overtimeMixedTypesForStage,
  buildOvertimeMixedReinforcementEntries,
  clampZombieSpawnRequest,
  runPooledEnemyRuntimeSoak,
} from './Enemies.jsx'

import { CHEST_OPEN_DELAY_MS } from './TreasureChest.jsx'
import { PLAYER_MESH_WORLD_HEIGHT } from '../lib/characterVisualScale.js'
import { STAGE2_SPAWN_TELEGRAPHS, STAGE2_WAVE_PHASES, STAGE3_WAVE_PHASES, STAGE4_WAVE_PHASES } from '../lib/waveTimelines.js'
import { BOSS_BURST_TYPES, STAGE2_MIXED_REINFORCEMENT, getBurstEventsForStage as burstsForStage, getRuntimeBurstEventsForStage, isBossType } from '../lib/burstEvents.js'
import { getStageBounds } from '../lib/stageConfig.js'
import { getStageObjectSightObstacles } from './StageObjects/stageObjectColliders.js'
import { ENEMY_STATS, getActiveE04ProjectileCount, resetActiveE04ProjectileCountForTest } from './Enemy.jsx'
import { MAX_ENEMIES } from '../lib/enemyEntityPool.js'
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

describe('boss runtime spawn routes', () => {
  it('does not schedule Stage 1 runtime zombie bursts before its first wave or an E01 18 event at any time', () => {
    const firstWaveSec = firstWaveTimeForStage('stage1')
    const runtimeZombieEvents = getRuntimeBurstEventsForStage('stage1')
      .filter((event) => !isBossType(event.type))

    expect(runtimeZombieEvents[0]).toEqual({ sec: firstWaveSec, type: 'E01', count: 10 })
    expect(runtimeZombieEvents.every((event) => event.sec >= firstWaveSec)).toBe(true)
    expect(runtimeZombieEvents).not.toContainEqual(expect.objectContaining({ type: 'E01', count: 18 }))
  })

  const bossStages = [
    ['stage1', 'B01'],
    ['stage2', 'B02'],
    ['stage3', 'B03'],
    ['stage4', 'B04'],
  ]

  it('schedules exactly one current boss event per stage and routes every boss to ZombieMesh', () => {
    const pooledRendererSource = readFileSync(new URL('./ZombieInstanceLayer.jsx', import.meta.url), 'utf8')
    const enemySource = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    const zombieMeshSource = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')

    expect(BOSS_BURST_TYPES).toEqual(bossStages.map(([, type]) => type))
    expect(pooledRendererSource).toContain('type>=1&&type<=8)||type===13||type===14')
    expect(enemySource).toContain('!useInstanced && <ZombieMesh')
    const previousPlayerPosition = { x: playerPos.x, z: playerPos.z }
    playerPos.x = 0
    playerPos.z = 0
    const bossSeconds = { stage1: 150, stage2: 120, stage3: 135, stage4: 140 }
    for (const [stageId, type] of bossStages) {
      const bosses = getRuntimeBurstEventsForStage(stageId)
        .filter((event) => isBossType(event.type))
      expect(bosses).toEqual([{ sec: bossSeconds[stageId], type, count: 1 }])
      expect(isPooledEnemyType(type)).toBe(false)
      expect(zombieMeshSource).toContain(`if (type === '${type}')`)
      expect(randomSpawnPos(type, getStageBounds(stageId), [], () => 0.25, getStageObjectSightObstacles(stageId))).not.toBeNull()
    }
    playerPos.x = previousPlayerPosition.x
    playerPos.z = previousPlayerPosition.z
    expect(isPooledEnemyType('E06')).toBe(true)
    expect(isPooledEnemyType('RZT')).toBe(true)
  })

  // E07 웃는얼굴 좀비: 버스트 표 → 스폰 위치 → 풀 라우팅까지 한 줄이라도 끊기면
  // '표에는 있는데 게임에는 안 나오는 적'이 된다. 세 링크를 함께 못박는다.
  it('routes the Stage 2 smiling-face zombie burst into the pooled spawn path', () => {
    const stage2 = getBurstEventsForStage('stage2')
    // 2026-08-17 1.3배 사다리 재설계로 마릿수는 6/11 → 5/6이 됐다. 여기서 지키려는 것은
    // 마릿수가 아니라 '표 → 스폰 위치 → 풀 라우팅' 세 링크가 끊기지 않는다는 사실이다.
    expect(stage2).toContainEqual({ sec: 60, type: 'E07', count: 5 })
    expect(stage2).toContainEqual({ sec: 108, type: 'E07', count: 6 })
    expect(isPooledEnemyType('E07')).toBe(true)
    expect(ENEMY_STATS.E07).toBeDefined()
    const previous = { x: playerPos.x, z: playerPos.z }
    playerPos.x = 0
    playerPos.z = 0
    expect(randomSpawnPos('E07', getStageBounds('stage2'), [], () => 0.25, getStageObjectSightObstacles('stage2'))).not.toBeNull()
    playerPos.x = previous.x
    playerPos.z = previous.z
  })

  it('routes the Stage 1 150s E07/E01 reinforcement through runtime pooled spawning only in stage1', () => {
    const stage1Runtime = getRuntimeBurstEventsForStage('stage1')
    expect(stage1Runtime).toContainEqual({ sec: 150, type: 'E07', count: 6 })
    expect(stage1Runtime).toContainEqual(expect.objectContaining({ sec: 150, type: 'E01', count: 6 }))
    for (const stageId of ['stage2', 'stage3', 'stage4']) {
      const runtime = getRuntimeBurstEventsForStage(stageId)
      expect(runtime).not.toContainEqual({ sec: 150, type: 'E07', count: 6 })
      expect(runtime).not.toContainEqual(expect.objectContaining({ sec: 150, type: 'E01', count: 6 }))
    }
    expect(isPooledEnemyType('E07')).toBe(true)
    expect(isPooledEnemyType('E01')).toBe(true)
    expect(ENEMY_STATS.E07).toBeDefined()
    expect(ENEMY_STATS.E01).toBeDefined()
  })

  it('routes the Stage 1 40s E01/E07 fixed reinforcement through the actual scheduled burst consumer', () => {
    const stage1Runtime = getRuntimeBurstEventsForStage('stage1')
    expect(stage1Runtime).toContainEqual({ sec: 40, type: 'E01', count: 6 })
    expect(stage1Runtime).toContainEqual({ sec: 40, type: 'E07', count: 3 })
    for (const stageId of ['stage2', 'stage3', 'stage4']) {
      const runtime = getRuntimeBurstEventsForStage(stageId)
      expect(runtime).not.toContainEqual({ sec: 40, type: 'E01', count: 6 })
      expect(runtime).not.toContainEqual({ sec: 40, type: 'E07', count: 3 })
    }

    expect(isPooledEnemyType('E01')).toBe(true)
    expect(isPooledEnemyType('E07')).toBe(true)
    expect(ENEMY_STATS.E01).toBeDefined()
    expect(ENEMY_STATS.E07).toBeDefined()
    expect(shouldScheduleBurst(0, 39.999, 40)).toBe(false)
    expect(shouldScheduleBurst(0, 40, 40)).toBe(true)
    expect(shouldScheduleBurst(1, 40.001, 40)).toBe(false)

    const enemySource = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    expect(enemySource).toContain('burstEvents: getRuntimeBurstEventsForStage(currentStageId)')
    expect(enemySource).toContain('const evt = cache.burstEvents[Math.trunc(a)]')
    expect(enemySource).toContain('enqueueScheduled(SCHEDULE_BURST, burstIndex, sec)')
    expect(enemySource).toContain('addEnemies(batch, true, cache.spawnToken)')
  })

  it('fires each boss burst once when elapsed time reaches its event second', () => {
    for (const [stageId] of bossStages) {
      const [boss] = getRuntimeBurstEventsForStage(stageId, 173).filter((event) => isBossType(event.type))
      expect(shouldScheduleBurst(0, boss.sec - 0.001, boss.sec)).toBe(false)
      expect(shouldScheduleBurst(0, boss.sec, boss.sec)).toBe(true)
      expect(shouldScheduleBurst(1, boss.sec + 300, boss.sec)).toBe(false)
    }
  })
})

describe('stage 2 mixed timed reinforcements', () => {
  // 2026-08-17 1.3배 사다리 재설계: 4×17(무거운 혼합 풀) → 150s ×8 / 216s ×10(경량 풀).
  // 무거운 풀은 pickMixedReinforcementTypes가 각 타입을 1마리씩 먼저 보장하기 때문에
  // '랜덤 구성'이 아니라 확정 난이도 상승이었다 — 이제 풀은 E01/E03만이다.
  it('adds light-pool mixed ordinary zombies at 150/216s and keeps E04 off the random pool', () => {
    const reinforcements = getRuntimeBurstEventsForStage('stage2')
      .filter((event) => event.reinforcement === STAGE2_MIXED_REINFORCEMENT)
    expect(reinforcements.map((event) => event.sec)).toEqual([150, 216])
    expect(reinforcements.map((event) => event.count)).toEqual([8, 10])

    for (const event of reinforcements) {
      expect(event.mixedTypes.length).toBeGreaterThan(1)
      expect(event.mixedTypes.every((type) => /^E0[13]$/.test(type))).toBe(true)
      expect(event.mixedTypes.some((type) => isBossType(type) || type === 'RZT' || type === 'RZG')).toBe(false)
      const picked = pickMixedReinforcementTypes(event.mixedTypes, event.count, () => 0)
      expect(picked).toHaveLength(event.count)
      expect(new Set(picked).size).toBeGreaterThan(1)
    }

    playerPos.x = 0
    playerPos.z = 0
    const bounds = getStageBounds('stage2')
    const distanceFromPlayer = (pos) => Math.hypot(pos[0] - playerPos.x, pos[2] - playerPos.z)
    expect(distanceFromPlayer(spawnPosForBurstType('E04', bounds, [], () => 0, []))).toBeGreaterThan(
      distanceFromPlayer(spawnPosForBurstType('E01', bounds, [], () => 0, [])),
    )
  })
})

describe('all-stage overtime mixed ordinary reinforcements', () => {
  it('starts exactly at 300s and advances one deterministic 30s tick for skipped frames without duplicates', () => {
    expect(OVERTIME_REINFORCEMENT_START_SEC).toBe(300)
    expect(OVERTIME_REINFORCEMENT_INTERVAL_SEC).toBe(30)
    expect(OVERTIME_REINFORCEMENT_COUNT).toBe(30)
    expect(overtimeReinforcementTick(299.999)).toBeNull()
    expect(overtimeReinforcementTick(300)).toBe(0)
    expect(overtimeReinforcementTick(329.999)).toBe(0)
    expect(overtimeReinforcementTick(330)).toBe(1)
    expect(overtimeReinforcementTick(360)).toBe(2)

    let lastTick = -1
    expect(shouldScheduleOvertimeReinforcement(lastTick, 299.999)).toEqual({ shouldSchedule: false, tick: null })
    let result = shouldScheduleOvertimeReinforcement(lastTick, 360)
    expect(result).toEqual({ shouldSchedule: true, tick: 2 })
    lastTick = result.tick
    expect(shouldScheduleOvertimeReinforcement(lastTick, 360.5)).toEqual({ shouldSchedule: false, tick: 2 })
    expect(shouldScheduleOvertimeReinforcement(-1, 300)).toEqual({ shouldSchedule: true, tick: 0 })
  })

  it('uses 30 injected-random ordinary E01-E07 picks and preserves the Stage 1 no-E04 rule', () => {
    expect(overtimeMixedTypesForStage('stage1')).toEqual(['E01', 'E02', 'E03', 'E05', 'E06', 'E07'])
    expect(overtimeMixedTypesForStage('stage2')).toEqual(['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07'])
    expect(overtimeMixedTypesForStage('stage3')).toEqual(['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07'])
    expect(overtimeMixedTypesForStage('stage4')).toEqual(['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07'])

    const rolls = [0, 0.19, 0.39, 0.5, 0.79, 0.99]
    let i = 0
    const stage1Types = buildOvertimeMixedReinforcementEntries('stage1', () => rolls[i++ % rolls.length]).map((entry) => entry.type)
    expect(stage1Types).toHaveLength(30)
    expect(stage1Types).toContain('E07')
    expect(stage1Types).not.toContain('E04')
    expect(stage1Types.some((type) => isBossType(type) || type === 'RZT' || type === 'RZG' || type === 'B01')).toBe(false)

    i = 0
    const stage2Types = buildOvertimeMixedReinforcementEntries('stage2', () => rolls[i++ % rolls.length]).map((entry) => entry.type)
    expect(stage2Types).toHaveLength(30)
    expect(stage2Types).toContain('E04')
    expect(stage2Types).toContain('E07')
  })

  it('caps concurrent pooled plus special plus deferred zombies at exactly 150 without deleting existing zombies', () => {
    expect(MAX_ENEMIES).toBe(150)
    expect(MAX_CONCURRENT_ZOMBIES).toBe(150)
    expect(clampZombieSpawnRequest(30, { pooledActive: 120, specialActive: 0, pooledQueued: 0 })).toBe(30)
    expect(clampZombieSpawnRequest(30, { pooledActive: 149, specialActive: 0, pooledQueued: 0 })).toBe(1)
    expect(clampZombieSpawnRequest(30, { pooledActive: 148, specialActive: 1, pooledQueued: 1 })).toBe(0)
    expect(clampZombieSpawnRequest(30, { pooledActive: 150, specialActive: 0, pooledQueued: 0 })).toBe(0)
  })

  it('wires overtime through the frame scheduler and pooled drain path', () => {
    const source = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    expect(source).toContain('const SCHEDULE_OVERTIME = 7')
    expect(source).toContain('overtimeTickRef.current = -1')
    expect(source).toContain('shouldScheduleOvertimeReinforcement(overtimeTickRef.current, sec)')
    expect(source).toContain('enqueueScheduled(SCHEDULE_OVERTIME)')
    expect(source).toContain('pooledActive: enemyPool.activeCount')
    expect(source).toContain('specialActive: enemiesRef.current.length')
    expect(source).toContain('pooledQueued: runtimeQueueRef.current.spawnDrain.count')
    expect(source).toContain('const count = clampZombieSpawnRequest(OVERTIME_REINFORCEMENT_COUNT, totalZombieCounts())')
    expect(source).toContain('buildOvertimeMixedReinforcementEntries(cache.id, Math.random, count)')
    expect(source).toContain('if (clampZombieSpawnRequest(1, totalZombieCounts()) <= 0) break')
    expect(source).toContain('addEnemies(batch, true, cache.spawnToken)')
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

  // 2026-08-06 톱니 완화: 90~96 구간은 더 이상 '완화 딥'이 아니다. 72~90과 동일 target으로 맞췄다.
  // (원래 이유였던 '정규화 격자 표본 t=90' 왜곡은 2026-08-07 격자 폐기로 사라졌지만, 6초짜리 구간만
  //  따로 꺼뜨리지 않는다는 연속성 규칙 자체는 유지한다.)
  // 96~120은 2026-08-07 재배분에서 19→17로 내렸다 — 골짜기가 아니라 스1 대비 1.7배 봉우리였고,
  // 그 몫을 120~168s 골짜기로 넘겼다.
  it('keeps stage 2 targets flat across the 72-96 ranged-introduction window', () => {
    const phases = getWavePhasesForStage('stage2')

    expect(phases.find((phase) => phase.start === 72).target).toBe(30)
    expect(phases.find((phase) => phase.start === 90).target).toBe(30)
    expect(phases.find((phase) => phase.start === 96).target).toBe(17)
    expect(phases.find((phase) => phase.start === 224).target).toBe(25)
  })

  it('reduces burst zombie counts after 90 seconds without removing boss events', () => {
    expect(getBurstEventsForStage('stage1').find((event) => event.sec === 108 && event.type === 'E01').count).toBe(6)
    expect(getBurstEventsForStage('stage1').find((event) => event.sec === 216 && event.type === 'E05').count).toBe(3)
    // 2026-08-17: 스2 E04는 발사 게이트와 같은 72초 1건만 남았다(216초 1마리는 예산 감축으로 제거).
    expect(getBurstEventsForStage('stage2').filter((event) => event.type === 'E04').map((event) => event.sec)).toEqual([72])
    expect(getBurstEventsForStage('stage2').find((event) => event.sec === 216 && event.type === 'E05').count).toBe(3)
    expect(getBurstEventsForStage('stage1').find((event) => event.sec === 150 && event.type === 'B01').count).toBe(1)
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

    expect(stage1Bursts.filter((event) => event.sec < 40).reduce((sum, event) => sum + event.count, 0)).toBe(19)
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

  it('fires the first wave at t=5 then accumulates random 20-40s gaps below the last phase end', () => {
    const lastEnd = WAVE_PHASES[WAVE_PHASES.length - 1].end
    // 결정적 random 시퀀스로 스케줄을 재현 — 첫 웨이브는 반드시 5초.
    const rolls = [0, 0.5, 1, 0.25, 0.75, 0, 1, 0.5, 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const random = () => rolls[i++ % rolls.length]
    const secs = getWaveSpawnSeconds(WAVE_PHASES, random)

    expect(secs[0]).toBe(5)
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

  // 2026-07-26 사용자 요청: 1스테이지 1웨이브 수량 70%로 조정(target 24→17).
  // 파생 체인: waveSizeForPhase round(17×0.5)=9 → rawWaveSizeForStage stage1 round(9×1.15)=10.
  // stage1은 밀도배율 앵커(×1)라 waveSizeForStageAtTime도 그대로 10. 기존 14의 ~71%.
  it('locks stage1 wave 1 (t=0 phase) runtime size at 10 (~71% of the previous 14)', () => {
    const wave1Phase = WAVE_PHASES[0]
    expect(wave1Phase.start).toBe(0)
    expect(wave1Phase.target).toBe(17)
    expect(waveSizeForStageAtTime(wave1Phase, 'stage1', 0)).toBe(10)
    // 중간 보강 스폰도 함께 하향: base round(9×0.5)=5 → round(5×1.15)=6 (기존 7에서 하향).
    // stage1은 밀도배율 앵커(×1)라 구조값(raw)과 실제 크기가 같다.
    expect(rawMidWaveSize(wave1Phase, 'stage1')).toBe(6)
    expect(midWaveSizeForStage(wave1Phase, 'stage1')).toBe(6)
  })

  it('keeps only the first two Stage 2 waves at 5s and 30s at 60 percent', () => {
    const opening = { target: 18 }
    const thirtySecond = { target: 22 }
    // 구조적 ×3 프론트로드와 밀도 계산은 유지하고, 최종 실제 산출 수만 원래의 60%로 줄인다.
    const dens = (raw) => Math.max(1, Math.round(raw * STAGE_DENSITY_MULTIPLIER.stage2))
    const beforeHalf = (raw) => Math.round(dens(raw) * STAGE2_SPAWN_MULTIPLIER)

    expect(firstWaveTimeForStage('stage2')).toBe(5)
    expect(firstWaveTimeForStage('stage1')).toBe(5)
    expect(nextWaveTimeForStage(5, 'stage2', () => 0)).toBe(30)
    expect(STAGE2_OPENING_GREEN_WAVE_MULTIPLIER).toBe(0.6)
    expect(rawWaveSizeForStage(opening, 'stage2', 5)).toBe(27)
    expect(rawWaveSizeForStage(thirtySecond, 'stage2', 30)).toBe(33)
    expect(rawWaveSizeForStage(thirtySecond, 'stage2', 20)).toBe(11)
    expect(waveSizeForStageAtTime(opening, 'stage2', 5)).toBe(Math.round(beforeHalf(27) * 0.6))
    expect(waveSizeForStageAtTime(thirtySecond, 'stage2', 30)).toBe(Math.round(beforeHalf(33) * 0.6))
    expect(waveSizeForStageAtTime(thirtySecond, 'stage2', 20)).toBe(beforeHalf(11))
  })

  it('applies the 1.15x spawn multiplier to every stage 1 wave timing only', () => {
    expect(STAGE1_SPAWN_MULTIPLIER).toBe(1.15)
    WAVE_PHASES.forEach((phase) => {
      const baseSize = waveSizeForPhase(phase)
      // stage1은 밀도배율 없음(앵커) → raw = round(base×1.15) 그대로.
      expect(waveSizeForStageAtTime(phase, 'stage1', phase.start))
        .toBe(Math.round(baseSize * STAGE1_SPAWN_MULTIPLIER))
      // stage3: raw는 t=0 오프닝만 ×2 프론트로드, 그 외 배율 없음. 실제 크기는 raw × stage3 밀도배율(√c).
      const raw = phase.start === 0 ? baseSize * 2 : baseSize
      expect(waveSizeForStageAtTime(phase, 'stage3', phase.start))
        .toBe(Math.max(1, Math.round(raw * STAGE_DENSITY_MULTIPLIER.stage3)))
    })
  })

  it('front-loads only the stage3 opening wave (t=0 x2) before applying the density multiplier', () => {
    const opening = { target: 20 }   // waveSize 10
    const later = { target: 30 }     // waveSize 15
    const dens = (raw) => Math.max(1, Math.round(raw * STAGE_DENSITY_MULTIPLIER.stage3))
    // raw: 오프닝 20, 이후 10; later 15(배율 없음). 밀도배율은 √c≈1.23.
    expect(rawWaveSizeForStage(opening, 'stage3', 0)).toBe(20)
    expect(rawWaveSizeForStage(opening, 'stage3', 34)).toBe(10)
    expect(rawWaveSizeForStage(later, 'stage3', 108)).toBe(15)
    expect(waveSizeForStageAtTime(opening, 'stage3', 0)).toBe(dens(20))
    expect(waveSizeForStageAtTime(opening, 'stage3', 34)).toBe(dens(10))
    expect(waveSizeForStageAtTime(later, 'stage3', 108)).toBe(dens(15))
  })

  it('keeps dense stage 1 runtime wave sizes in the reduced 1.15x band (14-20)', () => {
    WAVE_PHASES.filter((p) => p.target >= 24).forEach((phase) => {
      const size = waveSizeForStageAtTime(phase, 'stage1', phase.start)
      expect(size).toBe(Math.round(waveSizeForPhase(phase) * STAGE1_SPAWN_MULTIPLIER))
      expect(size).toBeGreaterThanOrEqual(14)
      expect(size).toBeLessThanOrEqual(20)
    })
  })
})

describe('midpoint reinforcement spawns (stage1 + stage2)', () => {
  it('raises delivered Stage 2 main and midpoint zombie counts by exactly 1.5x', () => {
    expect(STAGE2_SPAWN_MULTIPLIER).toBe(1.5)
    const phase = { target: 24 }
    const stage2Main = waveSizeForStageAtTime(phase, 'stage2', 100)
    const stage2Mid = midWaveSizeForStage(phase, 'stage2')
    const stage2BaseMain = Math.max(1, Math.round(waveSizeForPhase(phase) * STAGE_DENSITY_MULTIPLIER.stage2))
    const stage2BaseMid = Math.max(1, Math.round(rawMidWaveSize(phase, 'stage2') * STAGE_DENSITY_MULTIPLIER.stage2))
    expect(stage2Main).toBe(Math.round(stage2BaseMain * 1.5))
    expect(stage2Mid).toBe(Math.round(stage2BaseMid * 1.5))
    expect(waveSizeForStageAtTime(phase, 'stage1', 100)).toBe(Math.round(waveSizeForPhase(phase) * 1.15))
    const stage3BaseMain = Math.max(1, Math.round(waveSizeForPhase(phase) * STAGE_DENSITY_MULTIPLIER.stage3))
    expect(waveSizeForStageAtTime(phase, 'stage3', 100)).toBe(stage3BaseMain)
  })

  it('schedules a reinforcement at the exact midpoint between two waves, for MID_WAVE_STAGES only', () => {
    expect(midWaveTimeForStage(0, 30, 'stage1')).toBe(15)
    expect(midWaveTimeForStage(30, 60, 'stage1')).toBe(45)
    // 2026-08-07: stage2도 보강 대상에 포함(웨이브 사이 dead air 제거). 대상 정본은 MID_WAVE_STAGES.
    expect(MID_WAVE_STAGES.has('stage2')).toBe(true)
    expect(midWaveTimeForStage(0, 30, 'stage2')).toBe(15)
    // 스3/스4는 여전히 보강 없음 → Infinity(스케줄러가 발화하지 않는 센티넬).
    expect(midWaveTimeForStage(0, 30, 'stage3')).toBe(Infinity)
    expect(midWaveTimeForStage(0, 30, 'stage4')).toBe(Infinity)
  })

  it('sizes the reinforcement at half the main wave, minimum one', () => {
    // 기존 보강값(본 웨이브의 절반)에 Stage 1 ×1.15(하향)를 적용한다.
    expect(rawMidWaveSize({ target: 24 }, 'stage1')).toBe(7)   // base 6 × 1.15
    expect(rawMidWaveSize({ target: 34 }, 'stage1')).toBe(10)  // base 9 × 1.15
    expect(rawMidWaveSize({ target: 15 }, 'stage1')).toBe(5)   // base 4 × 1.15
    expect(rawMidWaveSize({ target: 11 }, 'stage1')).toBe(3)   // base 3 × 1.15
    // 빈 보강 방지: 아주 작은/누락 phase도 최소 1.
    expect(rawMidWaveSize({ target: 1 }, 'stage1')).toBe(1)
    expect(rawMidWaveSize({ target: 0 }, 'stage1')).toBe(1)
    expect(rawMidWaveSize(undefined, 'stage1')).toBe(1)
  })

  // STAGE1_SPAWN_MULTIPLIER는 stage1 전용 밀도 상수다. stage2는 STAGE_DENSITY_MULTIPLIER를
  // 따로 받으므로 여기서 1.15를 곱하면 밀도가 이중 적용된다 — raw는 순수 절반이어야 한다.
  it('never applies the stage1 1.15x density constant to stage2 reinforcements', () => {
    expect(rawMidWaveSize({ target: 24 }, 'stage2')).toBe(6)   // round(12 × 0.5) — ×1.15 없음
    expect(rawMidWaveSize({ target: 34 }, 'stage2')).toBe(9)
    expect(midWaveSizeForStage({ target: 24 }, 'stage2'))
      .toBe(Math.round(Math.max(1, Math.round(6 * STAGE_DENSITY_MULTIPLIER.stage2)) * STAGE2_SPAWN_MULTIPLIER))
  })

  it('derives stage1 midpoints strictly interleaved with the wave schedule', () => {
    // random 0.5 → 항상 30초 간격. 웨이브 5,35,…,215 → 보강은 정확히 그 사이 20,50,…,230.
    expect(getMidpointSpawnSeconds(WAVE_PHASES, 'stage1', () => 0.5))
      .toEqual([20, 50, 80, 110, 140, 170, 200, 230])

    // 임의(변동) 간격에서도 각 보강 시점은 인접 웨이브 사이에 정확히 놓인다.
    const rolls = [0, 0.5, 1, 0.25, 0.75, 0.4, 0.9, 0.1]
    let i = 0
    const random = () => rolls[i++ % rolls.length]
    const waves = getWaveSpawnSeconds(WAVE_PHASES, random)
    i = 0
    const mids = getMidpointSpawnSeconds(WAVE_PHASES, 'stage1', random)
    mids.forEach((mid, k) => {
      expect(mid).toBeGreaterThan(waves[k])
      expect(mid).toBeLessThan(waves[k + 1] ?? WAVE_PHASES.at(-1).end)
    })
  })

  it('derives stage2 midpoints too (stage2 joined MID_WAVE_STAGES on 2026-08-07)', () => {
    // random 0.5 → 30초 간격. 단 stage2는 첫 웨이브가 5초, 그 다음이 30초로 고정된다.
    expect(getMidpointSpawnSeconds(STAGE2_WAVE_PHASES, 'stage2', () => 0.5))
      .toEqual([17.5, 45, 75, 105, 135, 165, 195, 225])
  })

  it('produces no midpoint reinforcements for stage3 or stage4', () => {
    expect(getMidpointSpawnSeconds(STAGE3_WAVE_PHASES, 'stage3', () => 0.5)).toEqual([])
    expect(getMidpointSpawnSeconds(STAGE4_WAVE_PHASES, 'stage4', () => 0.5)).toEqual([])
  })
})

describe('boss entrance escort wave', () => {
  it('keeps the 2:30 B01 burst independent from the fixed general-zombie reinforcement', () => {
    const stage1At150 = getBurstEventsForStage('stage1').filter((event) => event.sec === 150)
    expect(stage1At150).toContainEqual({ sec: 150, type: 'B01', count: 1 })
    expect(stage1At150).toContainEqual({ sec: 150, type: 'E07', count: 6 })
    expect(stage1At150).toContainEqual({ sec: 150, type: 'E01', count: 6, mixedTypes: ['E01', 'E03'] })
    expect(bossEscortSize('stage1', WAVE_PHASES, 150)).toBe(0)
  })

  it('adds no escort on stage2/stage3 bosses (their boss phases are separately tuned)', () => {
    expect(bossEscortSize('stage2', STAGE2_WAVE_PHASES, 120)).toBe(0)
    expect(bossEscortSize('stage3', STAGE3_WAVE_PHASES, 135)).toBe(0)
    expect(bossEscortSize('stage3', STAGE3_WAVE_PHASES, 147)).toBe(0)
  })

  it('wires the boss escort and midpoint reinforcement into the spawn frame loop', () => {
    const source = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    expect(source).toContain('getRuntimeBurstEventsForStage(currentStageId)')
    // 보스와 일반 보강은 모두 명시 버스트 표에서만 발화한다.
    expect(source).not.toContain('bossEscortSize(cache.id, cache.wavePhases, evt.sec)')
    // 중간 보강도 자동 웨이브도 아닌 명시 버스트만 런타임에서 발화한다.
    expect(source).not.toContain('nextMidTimeRef.current = midWaveTimeForStage(waveTime, nextTime, currentStageId)')
    expect(source).not.toContain('midWaveSizeForStage(phase, cache.id)')
  })
})

describe('all zombie HP follows the cumulative 1.2x-per-stage curve', () => {
  it('applies the same cumulative Stage 1 baseline multiplier to every static zombie type', () => {
    expect(STAGE2_SAME_TYPE_HP_MULTIPLIER).toBe(1.2)
    expect(Object.keys(ENEMY_STATS)).toEqual(['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'RZL', 'RZC', 'RZT', 'RZG', 'E07', 'B01', 'B02', 'B03', 'B04'])
    const stageMultipliers = { stage1: 1, stage2: 1.2, stage3: 1.44, stage4: 1.728 }
    for (const [stageId, multiplier] of Object.entries(stageMultipliers)) {
      for (const [type, stats] of Object.entries(ENEMY_STATS)) {
        const expectedHp = Math.round(stats.hp * multiplier)
        expect(sameTypeZombieHpForStage(stats.hp, stageId)).toBe(expectedHp)
        expect(stageHpOverride(type, stageId)).toEqual(stageId === 'stage1' ? undefined : { hp: expectedHp })
      }
    }
  })

  it('applies the same curve to Matilda dynamic HP without changing the non-zombie doge curve', () => {
    expect(sameTypeZombieHpForStage(12.5, 'stage1')).toBe(12.5)
    expect(sameTypeZombieHpForStage(12.5, 'stage2')).toBe(15)
    expect(sameTypeZombieHpForStage(12.5, 'stage3')).toBe(18)
    expect(sameTypeZombieHpForStage(12.5, 'stage4')).toBe(22)
    const source = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    expect(source).toContain('sameTypeZombieHpForStage(matildaHpFromWeapons(store.weapons), cache.id)')
    expect(dogeHpForStage('stage2')).toBe(220)
    expect(dogeHpForStage('stage3')).toBe(242)
    expect(dogeHpForStage('stage4')).toBe(266)
    expect(stageHpOverride('NOPE', 'stage2')).toBeUndefined()
  })
})

describe('jarmob expected total keeps density separate from the user HP curve', () => {
  // 앵커 기준값이 4494 → 4597로 바뀐 이유: 30초 격자 8표본 모델을 폐기하고 지속시간 가중 모델로
  // 교체했다(격자는 stage1 240초 중 표본에 안 걸리는 구간을 통째로 빠뜨렸다).
  // stage1은 프론트로드가 없고 런타임 버스트도 보스뿐이라 앵커 = 웨이브+중간보강 지속시간 가중 부하다.
  it('anchors stage1 base expected jarmob HP in the abb28 10% E02/E03-reduced range', () => {
    const anchor = stageExpectedBaseJarmobHp('stage1')
    expect(anchor).toBeGreaterThanOrEqual(4350)
    expect(anchor).toBeLessThanOrEqual(4500)
  })

  it('uses the current expected-value modifier composition without using total HP to set individual HP', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      const hpMultiplier = STAGE_JARMOB_HP_MULTIPLIER[stageId] ?? 1
      const densityMultiplier = STAGE_DENSITY_MULTIPLIER[stageId] ?? 1
      const expected = stageExpectedBaseJarmobHp(stageId) * densityMultiplier * hpMultiplier
        + stageBurstJarmobBaseHp(stageId) * hpMultiplier
        + stageRunCrewFixedHp(stageId)
        + stage2GuardChaseFixedHp(stageId)
      expect(stageExpectedJarmobHp(stageId)).toBeCloseTo(expected, 10)
    }
  })

  // 보스 창(rollBossSpawnSec = 180 +- 10 -> 170~190s)은 168~192 phase가 통째로 덮는다.
  // 이 구간은 bossPressure로 E04 발사까지 막히므로 잡몹 부하를 깎으면 보스전이 가장 헐거워진다.
  it('never lets the stage2 boss window phase fall below its pre-rebalance load', () => {
    const bossPhase = getWavePhasesForStage('stage2').find((phase) => phase.start === 168)
    const perSpawn = Object.entries(bossPhase.weights)
      .reduce((sum, [type, weight]) => sum + weight * ENEMY_STATS[type].hp, 0)
    // abb28 10% E02 감소 적용 후: target 29(웨이브 15마리) x 104.83 = 1572.4
    expect(waveSizeForPhase(bossPhase) * perSpawn).toBeGreaterThanOrEqual(1572.4)
  })

  it('keeps the fixed HP curve separate from the existing density calculation', () => {
    expect(STAGE_JARMOB_HP_MULTIPLIER).toEqual({ stage2: 1.2, stage3: 1.44, stage4: 1.728 })
    // 2026-08-17 1.3배 사다리 재설계로 이 파생값이 움직였다. 원인은 명확하다:
    // 밀도 솔버는 (웨이브 base × m² + 버스트 잡몹 base × m + 크루 확정 HP = 앵커 × factor)를 풀어 m을 낸다.
    // 스2 버스트 잡몹 base가 크게 줄자 같은 factor를 맞추려고 웨이브 몫 m이 커졌고(0.64 → 0.92),
    // 스4는 버스트가 늘어 반대로 줄었다(1.32 → 1.22).
    // ⚠ 이 값은 게임플레이에 영향이 없다 — 랜덤 웨이브는 런타임에 발화하지 않고(SCHEDULE_WAVE 부재),
    //   실제 스폰은 전부 버스트 표 / 마틸다 / 오버타임 3경로에서만 나온다. 여기서는 파생식이
    //   조용히 NaN이 되거나 0으로 붕괴하지 않는다는 것만 못박는다.
    expect(STAGE_DENSITY_MULTIPLIER).toEqual({
      stage2: 0.921432893596188,
      stage3: 1.109827898020439,
      stage4: 1.2207060897622144,
    })
    for (const stageId of ['stage2', 'stage3', 'stage4']) {
      expect(STAGE_DENSITY_MULTIPLIER[stageId]).toBeGreaterThan(0)
      expect(STAGE_DENSITY_MULTIPLIER[stageId]).not.toBe(STAGE_JARMOB_HP_MULTIPLIER[stageId])
    }
    expect(STAGE_DENSITY_MULTIPLIER.stage1).toBeUndefined()
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
    // 체육교사 B03 단일 보스(135). 스1/스2 보스는 등장하지 않는다.
    const bosses = runtime.filter((e) => e.type === 'B01' || e.type === 'B02' || e.type === 'B03')
    expect(bosses).toEqual([{ sec: 135, type: 'B03', count: 1 }])
  })
})

describe('dancing doge event monster', () => {
  it('spawns once at the 60s mark for every stage', () => {
    expect(DOGE_SPAWN_SEC).toBe(60)
    // 60초 이전엔 스폰하지 않는다.
    expect(shouldSpawnDoge(59.9, false)).toBe(false)
    // 60초 도달 시 스폰(스테이지 무관 — 순수 시간 게이트).
    expect(shouldSpawnDoge(60, false)).toBe(true)
    expect(shouldSpawnDoge(75, false)).toBe(true)
    // 이미 스폰됐으면 재스폰하지 않는다(1회성).
    expect(shouldSpawnDoge(120, true)).toBe(false)
  })

  it('spawns at the stage center (0,0)', () => {
    expect(DOGE_SPAWN_POS[0]).toBe(0)
    expect(DOGE_SPAWN_POS[2]).toBe(0)
  })

  it('sizes the doge to twice the player world height', () => {
    // DOGE_SCALE × doge raw height(1.5) = 주인공 월드 키의 2배.
    expect(DOGE_SCALE * 1.5).toBeCloseTo(2 * PLAYER_MESH_WORLD_HEIGHT, 2)
  })

  it('follows the ascending +10% per-stage HP curve (base 200; x1.0 / x1.10 / x1.21 / x1.331)', () => {
    expect(DOGE_BASE_HP).toBe(200)
    expect(dogeHpForStage('stage1')).toBe(200)
    expect(dogeHpForStage('stage2')).toBe(Math.round(200 * 1.10))   // 220
    expect(dogeHpForStage('stage3')).toBe(Math.round(200 * 1.21))   // 242
    expect(dogeHpForStage('stage4')).toBe(Math.round(200 * 1.331))  // 266
    // 도지 HP는 60초 시점 이벤트 보너스몹 답게 기본값은 거대좀비 E06(320)보다 낮다.
    expect(DOGE_BASE_HP).toBeLessThan(ENEMY_STATS.E06.hp)
  })

  it('applies the cumulative 1.2x zombie HP multiplier (1.0/1.2/1.44/1.728) and keeps stage4 kitchen-specific wave shape', () => {
    // 모든 정적 좀비의 개별 HP는 스테이지마다 직전 ×1.2다(B01 base 1150로 반올림 오차 없이 검증).
    const base = ENEMY_STATS.B01.hp
    const ratio = (s) => (stageHpOverride('B01', s)?.hp ?? base) / base
    expect(ratio('stage1')).toBeCloseTo(1.0, 2)
    expect(ratio('stage2')).toBeCloseTo(1.2, 2)
    expect(ratio('stage3')).toBeCloseTo(1.44, 2)
    expect(ratio('stage4')).toBeCloseTo(1.728, 2)
    expect(ratio('stage2') / ratio('stage1')).toBeCloseTo(1.2, 2)
    expect(ratio('stage3') / ratio('stage2')).toBeCloseTo(1.2, 2)
    expect(ratio('stage4') / ratio('stage3')).toBeCloseTo(1.2, 2)
    // stage4 급식실 특유 형태 유지(조기·고비중 E04, 좁은 맵 저target, B04 단일 보스).
    expect(STAGE4_WAVE_PHASES.some((phase) => (phase.weights.E04 ?? 0) >= 0.2)).toBe(true)
    expect(STAGE4_WAVE_PHASES.some((phase) => phase.target < 20)).toBe(true)
    expect(getBurstEventsForStage('stage4').some((event) => event.type === 'B04')).toBe(true)
  })

  it('scatters a jackpot of gold coins around the opened chest, more than a boss drop', () => {
    // 잭팟 규모: 보스 골드 드랍(5)보다 확실히 많다.
    expect(DOGE_COIN_COUNT).toBe(12)
    expect(DOGE_COIN_COUNT).toBeGreaterThan(5)

    const center = [5, 0, -3]
    const positions = dogeTreasureCoinPositions(center, DOGE_COIN_COUNT, () => 0.5)
    expect(positions).toHaveLength(DOGE_COIN_COUNT)
    // 모든 코인은 상자 중심 주변 좁은 반경(<=1.5) 안에 흩어진다.
    positions.forEach(([x, , z]) => {
      const r = Math.hypot(x - center[0], z - center[2])
      expect(r).toBeGreaterThan(0)
      expect(r).toBeLessThanOrEqual(1.5)
    })
    // 좌표가 서로 달라야 GoldCoin이 좌표 시드로 사방으로 튄다(뭉침 방지).
    const distinct = new Set(positions.map(([x, , z]) => `${x.toFixed(3)},${z.toFixed(3)}`))
    expect(distinct.size).toBe(DOGE_COIN_COUNT)
  })

  it('opens the dropped chest 1.5 seconds after it lands', () => {
    expect(CHEST_OPEN_DELAY_MS).toBe(1500)
  })

  it('models the dropped chest after the brown wood and gray metal reference', () => {
    const source = readFileSync(new URL('./TreasureChest.jsx', import.meta.url), 'utf8')
    expect(source).toContain('const CHEST_METAL = 0x7f8790')
    expect(source).toContain('const CHEST_METAL_DARK = 0x555c64')
    expect(source).toContain('const CHEST_WOOD_LIGHT = 0xa6733b')
    expect(source).toContain('3단 박스로 둥근 아치형 보물상자 실루엣')
    expect(source).toContain('잠금판 + 열쇠구멍')
    expect(source).toContain('리벳')
    expect(source).toContain("emitSfx({ id: 'chestOpen'")
    expect(source).not.toContain('CHEST_GOLD')
  })

  it('wires the doge event, chest drop, and coin jackpot into the spawn frame loop', () => {
    const source = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    // 60초 스폰 게이트가 프레임 루프에 배선돼 있다.
    expect(source).toContain('shouldSpawnDoge(sec, dogeSpawnedRef.current)')
    expect(source).toContain('spawnDoge()')
    // 처치 → 상자, 상자 오픈 → 코인 산포 체인.
    expect(source).toContain("emitSfx({ id: 'chestDrop'")
    expect(source).toContain('setChests((prev) => [...prev, { id: ++_chestId, pos }])')
    expect(source).toContain('for (const coinPos of dogeTreasureCoinPositions(pos)) dropGoldCoin(coinPos)')
    // 도지/상자 개체를 렌더한다.
    expect(source).toContain('<DancingDogeEvent')
    expect(source).toContain('<TreasureChest')
    // 황금고블린 도주 배선: 스폰 시 도주 방향/경계 전달, 경계 이탈 시 보상 없이 제거.
    expect(source).toContain('dogeEscapeDirection(DOGE_SPAWN_POS, bounds)')
    expect(source).toContain('escapeDir={d.dir} bounds={d.bounds}')
    expect(source).toContain('onEscape={onDogeEscape}')
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

  it('큰 배치에서도 형태선 검사가 산출을 상한시키지 않는다 (36 요청 → 34+ 전달)', () => {
    // 회귀 방지: formsSpawnLine이 taken 전체를 검사하던 시절 이 루프는 배치 크기와 무관하게
    // ~14마리에서 포화했다(스2 프론트로드 36/45마리가 통째로 폐기됨).
    playerPos.x = 0
    playerPos.z = 0
    let seed = 1
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
    const taken = []
    for (let i = 0; i < 36; i += 1) {
      const pos = randomSpawnPos('E01', { halfX: 7.5, halfZ: 19.2 }, taken, random)  // stage2 복도
      if (pos) taken.push(pos)
    }

    expect(taken.length).toBeGreaterThanOrEqual(34)
  })

  it('type별 반경으로 obstacle 스폰을 거절하고 안전 후보가 없으면 null을 반환한다', () => {
    playerPos.x = 0
    playerPos.z = 0
    const obstacle = [{ x: 0, z: 6.5, halfX: 0.1, halfZ: 0.1 }]
    const pos = randomSpawnPos('E06', { halfX: 10, halfZ: 48 }, [], () => 0.25, obstacle)
    expect(enemySpawnRadius('E06')).toBeCloseTo(0.28 * 1.6 * (4 / 3), 6)
    expect(enemySpawnRadius('B01', 3)).toBeCloseTo(0.28 * 3 * (4 / 3), 6)
    const matilda = randomSpawnPos('B01', { halfX: 10, halfZ: 48 }, [], () => 0.25, [], 3)
    expect(matilda[1]).toBeCloseTo(0.24 * 3 * (4 / 3), 6)
    expect(pos).not.toBeNull()
    expect(spawnOverlapsObstacle(pos[0], pos[2], 'E06', obstacle)).toBe(false)
    const blocked = [{ x: 0, z: 0, halfX: 100, halfZ: 100 }]
    expect(randomSpawnPos('E01', { halfX: 10, halfZ: 48 }, [], () => 0, blocked)).toBeNull()
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

  it('creates a stage3 run zombie crew with one leader and twelve followers behind the diagonal path', () => {
    const stage3Arena = { halfX: 18, halfZ: 18 }
    const entries = createRunZombieCrewEntries(stage3Arena, () => 0.5)

    expect(entries).toHaveLength(RUN_ZOMBIE_CREW_SIZE)
    expect(entries[0]).toMatchObject({ type: 'RZL', runCrewRole: 'leader', runCrewDir: RUN_ZOMBIE_CREW_DIR })
    expect(entries.slice(1).every((entry) => entry.type === 'RZC' && entry.runCrewRole === 'crew')).toBe(true)
    expect(entries.slice(1).every((entry) => entry.pos[0] <= entries[0].pos[0] && entry.pos[2] <= entries[0].pos[2])).toBe(true)
  })

  it('keeps the run zombie crew as a diagonal screen-crossing swarm, not a ring/pincer clone', () => {
    const entries = createRunZombieCrewEntries({ halfX: 18, halfZ: 18 }, () => 0.5)
    const leader = entries[0]
    const last = entries[entries.length - 1]

    expect(RUN_ZOMBIE_CREW_DIR).toEqual({ x: 1, z: 1 })
    expect(leader.pos[0]).toBeLessThan(-15)
    expect(leader.pos[2]).toBeLessThan(-15)
    expect(last.pos[0]).toBeLessThan(leader.pos[0])
    expect(last.pos[2]).toBeLessThan(leader.pos[2])
  })

  it('creates the Stage 2 guard chase as one fugitive ahead of six guards for every map edge', () => {
    const stage2Arena = { halfX: 12, halfZ: 16 }
    for (let edge = 0; edge < 4; edge += 1) {
      const entries = createStage2GuardChaseEntries(stage2Arena, (() => {
        const values = [edge / 4 + 0.01, 0.2, 0.8]
        let index = 0
        return () => values[index++]
      })())
      expect(entries).toHaveLength(STAGE2_GUARD_CHASE_SIZE)
      expect(entries[0]).toMatchObject({ type: 'RZT', runCrewRole: 'fugitive' })
      expect(entries.slice(1).every((entry) => entry.type === 'RZG' && entry.runCrewRole === 'guard')).toBe(true)
      const dir = entries[0].runCrewDir
      expect(Math.hypot(dir.x, dir.z)).toBeCloseTo(1, 6)
      for (const guard of entries.slice(1)) {
        expect(guard.runCrewDir).toEqual(dir)
        const behind = (entries[0].pos[0] - guard.pos[0]) * dir.x + (entries[0].pos[2] - guard.pos[2]) * dir.z
        expect(behind).toBeGreaterThan(0)
      }
    }
  })

  it('keeps Stage 2 guard chase speed while doubling fugitive scale and raising its HP fivefold', () => {
    expect(ENEMY_STATS.RZT).toMatchObject({ hp: 140, speed: 1.4025, damage: 6, scale: 1.76, contactDist: 0.22 })
    expect(ENEMY_STATS.RZG).toMatchObject({ hp: 48, speed: 1.3475, damage: 9 })
    expect(STAGE2_GUARD_CHASE_SIZE).toBe(7)
    expect(ENEMY_STATS.RZL.speed).toBe(2.695)
    expect(ENEMY_STATS.RZC.speed).toBe(2.398)
  })

  it('blows the coach whistle once per run-zombie crew burst (crew-level, not per entity)', () => {
    const source = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    expect(source).toMatch(/RUN_ZOMBIE_CREW_FORMATION\)\s*\{\s*emitSfx\(\{ id: 'rzlWhistle', volume: 0\.5 \}\)/)
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

describe('pooled standard enemy runtime wiring', () => {
  it('routes a pooled hit spark to the body while keeping its damage number above the head', () => {
    const source = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    const hitHandlerStart = source.indexOf('pooledHitBridgeRef.current =')
    const hitHandlerEnd = source.indexOf('\n\n  useEffect(() => {', hitHandlerStart)
    const hitHandler = source.slice(hitHandlerStart, hitHandlerEnd)
    const flushStart = source.indexOf('while (queue.hitQueue.drainInto(queue.hitScratch))')
    const flushEnd = source.indexOf('\n      while (queue.deathCount > 0)', flushStart)
    const hitFlush = source.slice(flushStart, flushEnd)

    // 풀 적도 특수 Enemy와 같은 높이 계약을 지킨다: spark=몸통(0.42), 숫자=머리 위(0.95).
    expect(hitHandler).toMatch(/enqueuePooledHit\(\s*x,\s*0\.42\s*\*\s*enemyPool\.visualScale\[index\],\s*0\.95\s*\*\s*enemyPool\.visualScale\[index\]/)
    // flush 단계에서는 두 높이 채널을 각각 소비해야 하며, 예전 단일 hit.y 재사용은 금지한다.
    expect(hitFlush).toMatch(/createEnemyHitSparkEvent\(\{\s*x:\s*hit\.x,\s*y:\s*Math\.max\(0\.34,\s*hit\.(?:sparkY|bodyY)\),\s*z:\s*hit\.z\s*\}\)/)
    expect(hitFlush).toMatch(/emitDamageNumber\(\{\s*x:\s*hit\.x,\s*y:\s*Math\.max\(0\.8,\s*hit\.(?:damageNumberY|numberY)\)/)
  })

  it('stagger-checks obstacle sight by LOD while refreshing a new pool generation immediately', () => {
    const source = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    const frameStart = source.indexOf('usePlayingFrame((_, delta) =>')
    const frameEnd = source.indexOf('\n  return (', frameStart)
    const frame = source.slice(frameStart, frameEnd)
    expect(source).toContain('const sightGenerationRef       = useRef(new Uint16Array(MAX_ENEMIES))')
    expect(frame).toContain('shouldRefreshEnemySight(tier, index, sightFrame, sightGeneration[index], generation)')
    expect(frame).toContain('sightGeneration[index] = generation')
    expect(frame).toContain('enemySightBlocked[index] = 0')
    expect(frame).toContain('getPooledEnemyRenderTier(screenBounds')
  })

  it('runs a 3-minute churn harness with zero event drops and bounded proxy/projectile/special counts', () => {
    const result = runPooledEnemyRuntimeSoak()
    expect(result.ok).toBe(true)
    expect(result.eventDropped).toBe(0)
    expect(result.hitDropped).toBe(0)
    expect(result.active).toBeLessThanOrEqual(MAX_ENEMIES)
    expect(result.liveProxy).toBe(result.active)
    expect(result.projectiles).toBeLessThanOrEqual(32)
    expect(result.enemyBodies).toBeLessThanOrEqual(3)
    expect(result.dynamicSpecial).toBeLessThanOrEqual(3)
  })

  it('formation과 13 RZ crew는 동일 obstacle AABB와 겹치지 않는 후보만 만든다', () => {
    const obstacles = [{ x: 0, z: 0, halfX: 1.2, halfZ: 1.2 }]
    const positions = formationSpawnPositions('ring', 8, { halfX: 12, halfZ: 12 }, { x: 0, z: 0 }, () => 0.5, obstacles, 'E02')
    expect(positions).toHaveLength(8)
    positions.forEach((pos) => expect(spawnOverlapsObstacle(pos[0], pos[2], 'E02', obstacles)).toBe(false))
    const crew = createRunZombieCrewEntries({ halfX: 18, halfZ: 18 }, () => 0.5, [{ x: -17.3, z: -17.3, halfX: 1.2, halfZ: 1.2 }])
    expect(crew).toHaveLength(RUN_ZOMBIE_CREW_SIZE)
    crew.forEach((entry) => expect(spawnOverlapsObstacle(entry.pos[0], entry.pos[2], entry.type, [{ x: -17.3, z: -17.3, halfX: 1.2, halfZ: 1.2 }])).toBe(false))
  })

  it('renders only bounded special enemies through Enemy and keeps standard spawn work out of the frame callback', () => {
    const source = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    const frameStart = source.indexOf('usePlayingFrame((_, delta) =>')
    const frameEnd = source.indexOf('\n  return (', frameStart)
    const frameSource = source.slice(frameStart, frameEnd)
    expect(source).toContain('specialEnemies.map')
    expect(source).not.toContain('{enemies.map')
    expect(source).toContain('MAX_SPECIAL_ENEMIES = 3')
    expect(source).toContain('scheduleKind: new Uint8Array(64)')
    expect(source).toContain('deathType: new Uint8Array(MAX_RUNTIME_QUEUE)')
    expect(frameSource).not.toContain('buildWaveBatch(')
    expect(frameSource).not.toContain('addEnemies(')
    expect(frameSource).not.toContain('spawnDoge(')
    expect(frameSource).not.toContain('dropGoldCoin(')
  })

  it('queues explicit burst regular entries and drains at most three per RAF with stage-reset protection', () => {
    const source = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    expect(source).toContain('createPooledEnemySpawnDrainQueue()')
    expect(source).toContain('drainPooledEnemySpawnQueue(runtimeQueueRef.current.spawnDrain, cache.spawnToken, spawnPooledEnemy)')
    expect(source).toContain('resetPooledEnemySpawnDrainQueue(queue.spawnDrain)')
    expect(source).toContain("cache.gameKey !== store.gameKey")
    expect(source).toContain("useGameStore.getState().phase !== 'playing'")
    expect(source).toContain('const evt = cache.burstEvents[Math.trunc(a)]')
    expect(source).toContain('addEnemies(batch, true, cache.spawnToken)')
    expect(source).not.toContain('addEnemies(buildWaveBatch(phase, size, b, cache.bounds, cache.obstacles), true, cache.spawnToken)')
  })

  it('keeps the special Enemy frame state setters deferred and uses the fixed projectile pool', () => {
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    const enemyStart = source.indexOf('export default function Enemy(')
    const frameStart = source.indexOf('useFrame((_, delta) =>', enemyStart)
    const frameEnd = source.indexOf('\n  if (dead.current) return null', frameStart)
    const frameSource = source.slice(frameStart, frameEnd)
    expect(frameSource).not.toContain('setHp(')
    expect(frameSource).not.toContain('setHitFlash(')
    expect(frameSource).not.toContain('setSpawnRevealed(')
    expect(frameSource).not.toContain('setAnimPhase(')
    expect(frameSource).not.toContain('setProjectiles(')
    expect(frameSource).toContain("queueVisualState('spawnRevealed', true)")
    expect(frameSource).toContain('enemyProjectilePool.spawnInto(enemyHandleScratch')
    expect(frameSource).not.toContain('resolveChefBossActiveStats(')
    expect(frameSource).not.toContain('getStageBounds(currentStageId)')
    expect(frameSource).toContain('chefActiveStats.phase2')
    expect(frameSource).toContain('stageCombatConfig.bounds')
    expect(source).not.toContain('function EnemyProjectile(')
    expect(source).not.toContain('_activeE04ProjectileIds')
  })

  it('keeps Matilda out of the world until the shared gameplay-time dialogue grace expires', () => {
    const enemiesSource = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    const zombieMeshSource = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')
    const matildaMeshSource = readFileSync(new URL('./MatildaMesh.jsx', import.meta.url), 'utf8')
    const effectStart = enemiesSource.indexOf('// 마틸다 등장 대사를 읽는 동안')
    const effectEnd = enemiesSource.indexOf('\n\n  const dropTextbook', effectStart)
    const effectSource = enemiesSource.slice(effectStart, effectEnd)
    const frameStart = enemiesSource.indexOf('usePlayingFrame((_, delta) =>')
    const frameEnd = enemiesSource.indexOf('\n\n    const sec =', frameStart)
    const frameSource = enemiesSource.slice(frameStart, frameEnd)
    const schedulerStart = enemiesSource.indexOf('runtimeQueueRef.current.processScheduled = (kind, a, b) =>')
    const schedulerEnd = enemiesSource.indexOf('\n\n  // 도지 처치', schedulerStart)
    const schedulerSource = enemiesSource.slice(schedulerStart, schedulerEnd)
    const matildaBranchStart = schedulerSource.indexOf('kind === SCHEDULE_MATILDA')
    const matildaBranchEnd = schedulerSource.indexOf('} else if (kind === SCHEDULE_BURST', matildaBranchStart)
    const matildaBranch = schedulerSource.slice(matildaBranchStart, matildaBranchEnd)

    expect(enemiesSource).toContain("import { advanceMatildaEntryGrace, canSpawnMatildaEntry, cancelMatildaEntryGrace, createMatildaEntryGrace } from '../lib/matildaEntryGrace.js'")
    expect(effectSource).toContain('createMatildaEntryGrace({')
    expect(effectSource).toContain('delayMs: (matildaSec - matildaWarningSec) * 1000')
    expect(effectSource).toContain('cancelMatildaEntryGrace(entry)')
    expect(frameSource).toContain('advanceMatildaEntryGrace(matildaEntry, delta)')
    expect(frameSource).toContain('enqueueScheduled(SCHEDULE_MATILDA)')
    expect(frameSource).not.toContain('addEnemies(')
    expect(schedulerSource).toContain('kind === SCHEDULE_MATILDA')
    expect(schedulerSource).toContain('canSpawnMatildaEntry(entry, store)')
    expect(schedulerSource.indexOf('addEnemies([')).toBeGreaterThan(schedulerSource.indexOf('kind === SCHEDULE_MATILDA'))
    expect(matildaBranch).toContain("randomSpawnPos('B01'")
    expect(matildaBranch).toContain("type: 'B01'")
    expect(matildaBranch).toContain('statOverride: matildaStats')
    expect(matildaBranch).toContain('isMatilda: true')
    expect(matildaBranch).not.toContain('spawnBoss()')
    expect(isPooledEnemyType('B01')).toBe(false)
    expect(zombieMeshSource).toContain("import MatildaMesh from './MatildaMesh.jsx'")
    expect(zombieMeshSource).toContain('<MatildaMesh movementPose={animPhase !== \'stun\'} />')
    expect(matildaMeshSource).toContain("import matildaFaceTextureUrl from '../assets/character/matilda_face_texture.webp'")
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
    expect(source).toContain('fireArgs.activeProjectileCount = enemyProjectilePool.activeCount')
    expect(source).toContain('enemyProjectilePool.spawnInto(enemyHandleScratch')
    expect(source).toContain('stageCombatConfig.bossPressureStartSec')
    expect(source).toContain('stageCombatConfig.bossPressureEndSec')
    // 스2/스3는 보스 구간(bossWarning~escapePortal) E04 발사 억제를 유지한다.
    expect(source).toContain('elapsedSec >= stageCombatConfig.bossPressureStartSec && elapsedSec < stageCombatConfig.bossPressureEndSec')
    // 스4는 원거리 "안전지대 소멸" 시그니처라 보스 구간에도 발사(bossPressure 미적용).
    expect(source).toContain("currentStageId === 'stage4'")
    expect(source).toContain('fireArgs.introSec = stageCombatConfig.e04IntroSec')
  })
})
