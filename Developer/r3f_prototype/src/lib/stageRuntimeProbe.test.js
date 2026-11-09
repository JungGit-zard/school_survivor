// 런타임 정합 프로브(T-P1~T-P7) 자체의 테스트. 판정 임계값이 아니라 "프로브가 런타임 규칙을 그대로 따르는가"를 본다.
// 기준선 수치(100시드 이상)는 stageRuntimeProbe.baseline.test.js(환경변수 게이트)가 만든다.
import { describe, expect, it } from 'vitest'
import { DAMAGE_BIN_SEC, damageInWindow, probeBossPressure, runStageRuntimeProbe, SOURCE_CAULDRON, SOURCE_E04_SHOT } from './stageRuntimeProbe.js'
import { REF_BUILD_V1, refBuildPencilStats } from './refBuildV1.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { MAX_ENEMY_PROJECTILES } from './enemyProjectilePool.js'
import { getBossSpawnSec } from './burstEvents.js'
import { INV_DURATION, PLAYER_HIT_KNOCKBACK_MS } from '../components/Player.jsx'
import { enemyPool, playerPos } from './refs.js'
import { pairedProportionDiff, pairedRatioMedian } from './balanceProbeStats.js'
import { getRuntimeSpawnEventsForStage, postExitRepeatWaveIndex, postExitWaveCount } from './burstEvents.js'
import { overtimeReinforcementCountForTick, OVERTIME_REINFORCEMENT_COUNT } from '../components/Enemies.jsx'
import { PRESSURE_CAULDRON_DAMAGE_RADIUS } from './stage4PressureCauldronHazard.js'

const KITE4 = { kind: 'KITE', radius: 4, direction: 1 }
const LONG = 5 * 60 * 1000

describe('REF_BUILD_V1 성장 모델 (T-P4)', () => {
  it('레벨업마다 피해 ×1.12, 쿨다운 ×0.97, 5레벨마다 관통 +1', () => {
    const base = WEAPON_CATALOG.pencilThrow.base
    const start = REF_BUILD_V1.startDamageMultiplier.stage2
    const l1 = refBuildPencilStats(base, 1, 'stage2')
    expect(l1.damage).toBeCloseTo(base.damage * start, 10)
    expect(l1.cooldown).toBe(base.cooldown)
    expect(l1.pierce).toBe(base.pierce)
    const l6 = refBuildPencilStats(base, 6, 'stage2')
    expect(l6.damage).toBeCloseTo(base.damage * start * 1.12 ** 5, 10)
    expect(l6.cooldown).toBeCloseTo(base.cooldown * 0.97 ** 5, 10)
    expect(l6.pierce).toBe(base.pierce + 1)
    expect(refBuildPencilStats(base, 5, 'stage2').pierce).toBe(base.pierce)
    expect(refBuildPencilStats(base, 11, 'stage2').pierce).toBe(base.pierce + 2)
  })

  it('시작 배수는 S1~S5 모두 1.0 고정(맞춤 없음)이고 동결돼 있다', () => {
    expect(Object.isFrozen(REF_BUILD_V1)).toBe(true)
    expect(Object.isFrozen(REF_BUILD_V1.startDamageMultiplier)).toBe(true)
    expect(REF_BUILD_V1.startDamageMultiplier).toEqual({ stage1: 1, stage2: 1, stage3: 1, stage4: 1, stage5: 1 })
    expect(REF_BUILD_V1.calibrated).toBe(true)
    expect(REF_BUILD_V1.calibrationMethod).toBe('fixed')
    expect(REF_BUILD_V1.includesPostEscapeTenPercentWave).toBe(true)
  })
})

describe('T-P2 bossPressure', () => {
  it('런타임 정의 그대로: stage4 예외, [보스 등장, 포탈 개방) 반열림', () => {
    const boss = getBossSpawnSec('stage2')
    expect(probeBossPressure('stage2', boss - 0.01)).toBe(false)
    expect(probeBossPressure('stage2', boss)).toBe(true)
    expect(probeBossPressure('stage2', 209.99)).toBe(true)
    expect(probeBossPressure('stage2', 210)).toBe(false)
    expect(probeBossPressure('stage1', 180)).toBe(true)
    expect(probeBossPressure('stage4', 180)).toBe(false)
  })
})

describe('결정론', () => {
  it('다른 판을 먼저 돌린 뒤에도(두 번째 판부터) 같은 시드는 같은 결과다', () => {
    runStageRuntimeProbe({ stageId: 'stage3', seed: 99, bot: KITE4, maxSec: 40 })
    const a = runStageRuntimeProbe({ stageId: 'stage2', seed: 41, bot: KITE4, maxSec: 60 })
    runStageRuntimeProbe({ stageId: 'stage4', seed: 7, bot: { kind: 'IDLE' }, maxSec: 30 })
    const b = runStageRuntimeProbe({ stageId: 'stage2', seed: 41, bot: KITE4, maxSec: 60 })
    expect(b).toEqual(a)
  }, LONG)

  it('같은 시드·같은 구성은 4회 모두 결과가 같다', () => {
    const runs = Array.from({ length: 4 }, () => runStageRuntimeProbe({ stageId: 'stage2', seed: 41, bot: KITE4, maxSec: 120 }))
    for (const run of runs.slice(1)) expect(run).toEqual(runs[0])
    expect(runs[0].randomDraws).toBeGreaterThan(0)
  }, LONG)

  it('같은 시드 짝비교(기준선 대 기준선)는 차이 CI가 [0, 0]이다', () => {
    const seeds = [3, 4, 5]
    const a = seeds.map((seed) => runStageRuntimeProbe({ stageId: 'stage1', seed, bot: KITE4, maxSec: 90 }))
    const b = seeds.map((seed) => runStageRuntimeProbe({ stageId: 'stage1', seed, bot: KITE4, maxSec: 90 }))
    expect(pairedProportionDiff(a.map((r) => [r.died]), b.map((r) => [r.died]))).toMatchObject({ diff: 0, low: 0, high: 0 })
    const hashesA = a.map((r) => r.spawnHash)
    expect(b.map((r) => r.spawnHash)).toEqual(hashesA)
    const ratio = pairedRatioMedian(a.map((r) => [r.damageTotal + 1]), b.map((r) => [r.damageTotal + 1]))
    expect(ratio.ratio).toBe(1)
  }, LONG)
})

describe('T-P1 스폰 완전성 (런타임 경로)', () => {
  it('stage3: 단발 버스트·반복 증원·보스·마틸다가 런타임 표 그대로 나온다', () => {
    const run = runStageRuntimeProbe({ stageId: 'stage3', seed: 2, bot: { ...KITE4, portalMode: 'refuse' }, immortal: true, maxSec: 215 })
    expect(run.spawnCountBySource.burst).toBeGreaterThan(30)
    expect(run.spawnCountBySource['burst-repeat']).toBeGreaterThan(30)
    expect(run.spawnCountBySource.boss).toBe(1)
    expect(run.spawnCountBySource.matilda).toBe(1)
    expect(run.maxActiveEnemies).toBeLessThanOrEqual(150)
  }, LONG)

  it('마틸다는 210s(경고 205s + 대사 5s) 전에는 나오지 않는다', () => {
    const before = runStageRuntimeProbe({ stageId: 'stage1', seed: 9, bot: { ...KITE4, portalMode: 'refuse' }, immortal: true, maxSec: 209.9 })
    expect(before.spawnCountBySource.matilda ?? 0).toBe(0)
    expect(before.portal).toBeNull()
  }, LONG)
})

describe('C1 런타임 스폰 함수 짝 검사 (749d779 탈출 이후 +10%)', () => {
  it('오버타임 요청 마릿수가 런타임 함수와 같고, 스테이지 이름을 인자로 넘기지 않는다', () => {
    for (const tick of [0, 1, 2, 5]) {
      expect(overtimeReinforcementCountForTick(tick)).toBe(postExitWaveCount(OVERTIME_REINFORCEMENT_COUNT, tick))
    }
    const run = runStageRuntimeProbe({ stageId: 'stage1', seed: 21, bot: { ...KITE4, portalMode: 'refuse' }, immortal: true, maxSec: 335 })
    const overtime = run.spawnRequests.filter((r) => r.kind === 'overtime')
    expect(overtime.length).toBeGreaterThanOrEqual(3)
    for (const request of overtime) {
      expect(request.requested).toBe(overtimeReinforcementCountForTick(request.tick))
      expect(request.requested).toBeGreaterThan(0)
    }
    expect(overtime.at(-1).requested).toBeGreaterThan(OVERTIME_REINFORCEMENT_COUNT)
  }, LONG)

  it('Stage 3 반복 증원: 210s 이후 회차 마릿수가 런타임 함수와 같고 회차마다 늘어난다', () => {
    const events = getRuntimeSpawnEventsForStage('stage3')
    const run = runStageRuntimeProbe({ stageId: 'stage3', seed: 4, bot: { ...KITE4, portalMode: 'refuse' }, immortal: true, maxSec: 262 })
    const repeats = run.spawnRequests.filter((r) => r.kind === 'repeat')
    expect(repeats.length).toBeGreaterThan(0)
    for (const request of repeats) {
      const evt = events[request.eventIndex]
      expect(request.requested).toBe(postExitWaveCount(evt.count ?? 1, postExitRepeatWaveIndex(evt, request.tick, 210)))
      expect(request.spawned).toBeLessThanOrEqual(request.requested)
    }
    const postExitE01 = repeats.filter((r) => events[r.eventIndex].type === 'E01' && events[r.eventIndex].count === 10 && postExitRepeatWaveIndex(events[r.eventIndex], r.tick, 210) >= 0)
    expect(postExitE01.length).toBeGreaterThanOrEqual(4)
    expect(postExitE01[0].requested).toBe(10)
    expect(postExitE01.at(-1).requested).toBeGreaterThan(10)
  }, LONG)
})

describe('C2 Stage 5', () => {
  it('Stage 5도 버스트·보스·포탈·마틸다가 런타임 그대로 돈다', () => {
    const run = runStageRuntimeProbe({ stageId: 'stage5', seed: 3, bot: KITE4, immortal: true, maxSec: 230 })
    expect(run.spawnCountBySource.burst).toBeGreaterThan(20)
    expect(run.spawnCountBySource.boss).toBe(1)
    // 교무실 개편(2026-11-08): 보스는 B10 교감 좀비, 실효 HP 3,241(150초 = 30초 bin 5).
    expect(run.spawnHpByBin[Math.floor(150 / 30)].boss).toBe(3241)
    // 전교 호출(73·133·193)과 보스 구간 잡몹(160·180·200·220)은 반복 경로로 나온다.
    expect(run.spawnCountBySource['burst-repeat']).toBeGreaterThan(0)
    expect(run.maxActiveEnemies).toBeLessThanOrEqual(150)
    expect(run.cleared).toBe(true)
    expect(run.clearSec).toBeGreaterThanOrEqual(211)
  }, LONG)

  // 게이트 자체(11.9s 불가·12s 가능)는 stage2ProjectileRules.test.js가 본다. 여기서는 프로브가 그 게이트를
  // 실제로 타서 Stage 5 사수가 초반에 쏘는지만 확인한다 — 옛 72초 게이트였다면 40초 창의 E04 피해는 0이다.
  // (프로브·런타임의 게이트는 캐치업으로 앞당겨질 수 있는 스폰 시계를 본다.)
  // wave 4(2026-11-08): Stage 5는 책상 섬이 E04 사선을 끊는다 — 가운데 광장에 가만히 선 IDLE은 대개 사선 밖이라
  // 움직이는 KITE 봇으로 본다(레인에 들어서면 사선이 열린다). 여러 시드 중 하나라도 맞으면 게이트가 살아 있는 것이다.
  // 400판 실측(seed 1~200 × KITE 2종): E04 피해는 판당 약 5(≈ 0.6발) — 줄었지만 0은 아니다.
  it('Stage 5 원거리 E04는 사선이 열린 레인에서 실제로 맞힌다(시드 1~8 × 120초 합계 > 0)', () => {
    const hits = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => runStageRuntimeProbe({ stageId: 'stage5', seed, bot: KITE4, immortal: true, maxSec: 120 }).damageBySource[SOURCE_E04_SHOT] ?? 0)
    expect(hits.reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
  }, LONG)
})

describe('C3 압력솥 회피 / C5 분해 지표', () => {
  it('stage4: 예고를 보지 않는 KITE·IDLE도 끓는 압력솥에서 벗어난다(폭발 4회 중 최대 1회만 맞는다)', () => {
    // 피격 넉백(facing 반대 방향)이 탈출 중인 봇을 안쪽으로 되밀 수 있어 0회를 요구하지 않는다(런타임 그대로).
    for (const bot of [KITE4, { kind: 'IDLE' }]) {
      const run = runStageRuntimeProbe({ stageId: 'stage4', seed: 5, bot, immortal: true, maxSec: 62 })
      expect(run.damageBySource[SOURCE_CAULDRON] ?? 0).toBeLessThanOrEqual(20)
    }
  }, LONG)

  it('210s 생존 여부, 210s 스폰 시계, 30s 구간 출처별 스폰 HP를 남긴다', () => {
    const run = runStageRuntimeProbe({ stageId: 'stage2', seed: 6, bot: KITE4, immortal: true })
    expect(run.alive210).toBe(true)
    expect(run.spawnClockAt210).toBeGreaterThanOrEqual(210)
    expect(run.spawnHpByBin[0].burst).toBeGreaterThan(0)
    const bossBin = run.spawnHpByBin[Math.floor(150 / 30)]
    expect(bossBin.boss).toBeGreaterThan(1000)
    // 마틸다는 210s 프레임(부동소수 209.99s)에 나와 180~210 구간에 잡힐 수 있다.
    expect((run.spawnHpByBin[6].matilda ?? 0) + (run.spawnHpByBin[7].matilda ?? 0)).toBeGreaterThan(0)
    // 마틸다 HP = 연필 DPS × 1,800s(사실상 불사). 무기 active 표시가 빠지면 DPS 0 → HP 1이 되어 한 발에 죽는다.
    expect(run.matildaSpawnHp).toBeGreaterThan(5000)
  }, LONG)
})

describe('T-P5 불사 기록 모드', () => {
  it('HP를 깎지 않고 합산만 하며, 520ms 피격 무적을 유지하고, 출처별로 나눠 적는다', () => {
    const run = runStageRuntimeProbe({ stageId: 'stage3', seed: 1, bot: { kind: 'IDLE' }, immortal: true, maxSec: 120 })
    expect(run.died).toBe(false)
    expect(run.finalHp).toBe(100)
    expect(run.damageTotal).toBeGreaterThan(100)
    expect(run.minHitGapMs).toBeGreaterThanOrEqual(INV_DURATION)
    const sourceSum = Object.values(run.damageBySource).reduce((a, b) => a + b, 0)
    expect(sourceSum).toBeCloseTo(run.damageTotal, 6)
    expect(run.damageByBin.reduce((a, b) => a + b, 0)).toBeCloseTo(run.damageTotal, 6)
    expect(Object.keys(run.damageBySource).every((key) => key.includes(':'))).toBe(true)
    expect(damageInWindow(run, 0, 120)).toBeCloseTo(run.damageTotal, 6)
    expect(DAMAGE_BIN_SEC).toBe(10)
  }, LONG)
})

describe('T-P6 적 투사체·지대·변위', () => {
  it('stage4: E04 탄이 런타임 풀로 날아와 맞고, 동시 비행 수는 풀 상한을 넘지 않는다', () => {
    const run = runStageRuntimeProbe({ stageId: 'stage4', seed: 3, bot: { kind: 'IDLE' }, immortal: true, maxSec: 90 })
    expect(run.damageBySource[SOURCE_E04_SHOT]).toBeGreaterThan(0)
    expect(run.maxActiveProjectiles).toBeGreaterThan(0)
    expect(run.maxActiveProjectiles).toBeLessThanOrEqual(MAX_ENEMY_PROJECTILES)
  }, LONG)

  it('stage4 압력솥: 중앙(반경 3.2u) 안에서 15초마다 최대 HP 20%를 무적 관통으로 받는다', () => {
    const run = runStageRuntimeProbe({ stageId: 'stage4', seed: 5, bot: { kind: 'IDLE', ignoreHazards: true }, immortal: true, maxSec: 46 })
    const cauldron = run.damageBySource[SOURCE_CAULDRON] ?? 0
    expect(cauldron).toBeGreaterThanOrEqual(20)
    expect(cauldron % 20).toBe(0)
    expect(cauldron).toBeLessThanOrEqual(60)
  }, LONG)

  it('피격 넉백: 스스로 움직이지 않는 IDLE도 맞을 때만 밀리고, 한 번에 4u/s × 160ms 이하로 밀린다', () => {
    let moves = 0
    let maxStep = 0
    let previous = null
    const run = runStageRuntimeProbe({
      stageId: 'stage2', seed: 7, bot: { kind: 'IDLE' }, immortal: true, maxSec: 60,
      onFrame: () => {
        const now = { x: playerPos.x, z: playerPos.z }
        if (previous) {
          const step = Math.hypot(now.x - previous.x, now.z - previous.z)
          if (step > 1e-9) moves += 1
          maxStep = Math.max(maxStep, step)
        }
        previous = now
      },
    })
    expect(run.hitsApplied).toBeGreaterThan(0)
    expect(moves).toBeGreaterThan(0)
    expect(moves).toBeLessThanOrEqual(run.hitsApplied * Math.ceil(PLAYER_HIT_KNOCKBACK_MS / (1000 / 60)) + 1)
    expect(maxStep).toBeLessThanOrEqual(4 / 60 + 1e-6)
  }, LONG)
})

describe('T-P7 클리어 = 210s 이후 포탈 진입', () => {
  it('rush 봇은 210s 개방 후 포탈에 들어가 흡입 1s 뒤 클리어한다(240s 자동 클리어 없음)', () => {
    const run = runStageRuntimeProbe({ stageId: 'stage1', seed: 11, bot: KITE4, immortal: true })
    expect(run.cleared).toBe(true)
    expect(run.clearSec).toBeGreaterThanOrEqual(211)
    expect(run.portal).not.toBeNull()
  }, LONG)

  it('포탈 거부 봇은 들어가지 않고 maxSec까지 간다(불사 모드)', () => {
    let maxEnemies = 0
    const run = runStageRuntimeProbe({
      stageId: 'stage1', seed: 11, bot: { ...KITE4, portalMode: 'refuse' }, immortal: true, maxSec: 260,
      onFrame: () => { maxEnemies = Math.max(maxEnemies, enemyPool.activeCount) },
    })
    expect(run.cleared).toBe(false)
    expect(run.survivedSec).toBe(260)
    expect(run.spawnCountBySource.overtime).toBeGreaterThan(0)
    expect(maxEnemies).toBeGreaterThan(0)
  }, LONG)
})
