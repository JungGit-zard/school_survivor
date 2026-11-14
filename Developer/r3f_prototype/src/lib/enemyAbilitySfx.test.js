import { statSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AMBIENT_GROAN_SFX,
  CUE_BUDGET,
  DEFAULT_SPAWN_SFX,
  ENEMY_ABILITY_SFX,
  EXPANSION_BEHAVIOR_SFX,
  HEAR_FAR_U,
  SHOT_IMPACT_KIND,
  SHOT_IMPACT_SFX,
  cueEnemyAttackSfx,
  cueEnemyDeathSfx,
  cueEnemySpawnSfx,
  cueEnemyTelegraphSfx,
  cueShotImpactSfx,
  listEnemyAbilitySfxIds,
  resetEnemyAbilitySfx,
} from './enemyAbilitySfx.js'
import { subscribeSfx } from './sfxEvents.js'
import { POLYPHONY_COOLDOWN, SOUND_MAP, isProtectedSfx } from './sfxRegistry.js'
import { ENEMY_TYPE_CODES, createEnemyEntityPool } from './enemyEntityPool.js'
import { ENEMY_SIZE_MULTIPLIER, createEnemySimulationRuntime, ENEMY_EVENT_PROJECTILE_ZOMBIE_FIRE, ENEMY_EVENT_PROJECTILE_ZOMBIE_TELEGRAPH } from './enemySimulation.js'
import { EXPANSION_ENEMIES } from './expansionContent.js'
import { SHOT_KIND, createProjectileZombieShotPool, createShotSpec, SHOT_MOTION } from './projectileZombieShotPool.js'
import { spawnProjectileZombieVolley, spawnProjectileZombieTelegraphDecal } from './projectileZombieBehavior.js'
import { ZOMBIE_DEATH_SFX_IDS, deathSfxId } from './enemyDeathSfx.js'
import { ENEMY_STATS } from '../components/Enemy.jsx'

const NEW_GAG_IDS = [
  'gagWindup', 'gagSwoosh', 'gagSneakerSqueak', 'gagWahWah', 'gagToss', 'gagSplash', 'gagBallThwack',
  'gagChoirLa', 'gagPotionBlorp', 'gagPaintSplat', 'gagMegaphone', 'gagBuffSparkle', 'gagCardFlick',
  'gagRopeWhirr', 'gagTrayClatter', 'gagChalkPuff', 'gagSplitSquelch', 'gagDominoClack', 'gagBlinkPop',
  'gagCartonPop', 'gagPropClatter',
]
const MELEE_NOVEL = ['E34', 'E35', 'E36', 'E37', 'E38', 'E39', 'E40', 'E41', 'E42', 'E43', 'E44', 'E45']
const PROJECTILE_NOVEL = Array.from({ length: 25 }, (_, k) => `E${46 + k}`)
const DT = 1 / 60

let heard
let unsubscribe
let fakeNow

beforeEach(() => {
  heard = []
  fakeNow = 0
  resetEnemyAbilitySfx({ now: () => fakeNow })
  unsubscribe = subscribeSfx((event) => heard.push(event))
})

afterEach(() => {
  unsubscribe()
  resetEnemyAbilitySfx()
  vi.restoreAllMocks()
})

describe('신규 좀비 개그 음원 등록', () => {
  it('21종 모두 레지스트리에 있고 OGG+MP3 쌍이 작으며 쿨다운이 걸려 있다', () => {
    for (const id of NEW_GAG_IDS) {
      expect(SOUND_MAP[id], id).toBe(`/sfx/enemies/${id}.ogg`)
      expect(POLYPHONY_COOLDOWN[id], `${id} cooldown`).toBeGreaterThanOrEqual(90)
      // /enemies/ = combat 클래스 → 전투 보이스 상한 안에서만 울린다(동시 재생 상한).
      expect(isProtectedSfx(id), `${id} must stay under the combat voice cap`).toBe(false)
      for (const extension of ['ogg', 'mp3']) {
        const size = statSync(new URL(`../../public/sfx/enemies/${id}.${extension}`, import.meta.url)).size
        expect(size, `${id}.${extension}`).toBeGreaterThan(800)
        expect(size, `${id}.${extension}`).toBeLessThanOrEqual(12 * 1024)
      }
    }
  })

  it('이 모듈이 내는 모든 id가 등록돼 있다(오타면 playSfx가 조용히 무음이 된다)', () => {
    for (const id of listEnemyAbilitySfxIds()) expect(SOUND_MAP[id], id).toBeTruthy()
  })

  it('예전엔 어디서도 안 울리던 기존 좀비 음원이 이제 배정돼 있다', () => {
    const ids = new Set(listEnemyAbilitySfxIds())
    for (const id of ['zombieGroan', 'zombieRunnerScreech', 'zombieTankGroan', 'zombieRangedShoot', 'zombieChargeRoar', 'zombieSpawn']) {
      expect(ids.has(id), id).toBe(true)
    }
    for (const id of ['zombieGroan', 'zombieRunnerScreech', 'zombieTankGroan', 'zombieRangedShoot']) {
      expect(POLYPHONY_COOLDOWN[id], `${id} cooldown`).toBeGreaterThanOrEqual(300)
    }
  })

  it('착지·폭발 표의 kind 숫자가 탄 풀의 SHOT_KIND와 같다(순환 import 때문에 숫자로 적었다)', () => {
    for (const [name, value] of Object.entries(SHOT_IMPACT_KIND)) expect(SHOT_KIND[name], name).toBe(value)
  })
})

describe('신규 좀비 37종은 무음이 아니다', () => {
  it('근접 12종은 예고·공격·사망 개그가 모두 있고, 사망 트롬본 피치가 종마다 다르다', () => {
    const deathRates = new Set()
    for (const type of MELEE_NOVEL) {
      const entry = ENEMY_ABILITY_SFX[type]
      expect(entry?.telegraph, `${type} telegraph`).toBeTruthy()
      expect(entry?.attack, `${type} attack`).toBeTruthy()
      expect(entry?.death?.id, `${type} death`).toBe('gagWahWah')
      deathRates.add(entry.death.rate)
    }
    expect(deathRates.size).toBe(MELEE_NOVEL.length)
  })

  it('투사체 25종은 공격·사망 개그가 모두 있고 (id, 피치) 조합이 종마다 다르다', () => {
    const attackKeys = new Set()
    const deathKeys = new Set()
    for (const type of PROJECTILE_NOVEL) {
      const entry = ENEMY_ABILITY_SFX[type]
      expect(entry?.attack, `${type} attack`).toBeTruthy()
      expect(entry?.death, `${type} death`).toBeTruthy()
      attackKeys.add(`${entry.attack.id}@${entry.attack.rate}`)
      deathKeys.add(`${entry.death.id}@${entry.death.rate}`)
    }
    expect(attackKeys.size).toBe(PROJECTILE_NOVEL.length)
    expect(deathKeys.size).toBe(PROJECTILE_NOVEL.length)
  })

  it('Stage 6 확장 적의 특수행동(국민체조 고리·계주 돌진)에 예고·발동음이 있다', () => {
    for (const id of ['E20', 'E21']) {
      const behavior = EXPANSION_ENEMIES[id].behaviorId
      expect(EXPANSION_BEHAVIOR_SFX[behavior]?.windup, `${id} windup`).toBeTruthy()
      expect(EXPANSION_BEHAVIOR_SFX[behavior]?.active, `${id} active`).toBeTruthy()
    }
    // 초안 스테이지 7~10의 행동도 표에 빠짐없이 있다.
    for (const enemy of Object.values(EXPANSION_ENEMIES)) {
      if (enemy.behaviorId !== 'chase') expect(EXPANSION_BEHAVIOR_SFX[enemy.behaviorId], enemy.id).toBeTruthy()
    }
  })

  it('사망 개그는 사망 발성 랜덤 풀을 대체하지 않는다(Terry 2026-08-22 규칙)', () => {
    for (const type of [...MELEE_NOVEL, ...PROJECTILE_NOVEL]) {
      expect(ZOMBIE_DEATH_SFX_IDS).toContain(deathSfxId(type, false, () => 0.5))
    }
  })
})

describe('소음 예산', () => {
  const E34 = ENEMY_TYPE_CODES.E34
  const E61 = ENEMY_TYPE_CODES.E61

  it('같은 소리는 간격 안에서 한 번만, 간격이 지나면 다시 낸다', () => {
    expect(cueEnemyAttackSfx(E34, 0, 0, 0, 0)).toBe(true)
    expect(cueEnemyAttackSfx(E34, 0, 0, 0, 0)).toBe(false)
    fakeNow += ENEMY_ABILITY_SFX.E34.attack.gapMs
    expect(cueEnemyAttackSfx(E34, 0, 0, 0, 0)).toBe(true)
    expect(heard.map((event) => event.id)).toEqual(['gagSwoosh', 'gagSwoosh'])
  })

  it('한꺼번에 몰려 나와도 등장음은 400ms에 2개까지', () => {
    let spawns = 0
    for (let k = 0; k < 20; k += 1) if (cueEnemySpawnSfx(ENEMY_TYPE_CODES[k % 2 ? 'E02' : 'E03'], 0, 0, 0, 0)) spawns += 1
    expect(spawns).toBe(CUE_BUDGET.spawn)
  })

  it('400ms 창 안에서 행동 신호는 최대 4개, 사망 개그는 최대 2개', () => {
    let abilities = 0
    for (const type of PROJECTILE_NOVEL) if (cueEnemyAttackSfx(ENEMY_TYPE_CODES[type], 0, 0, 0, 0)) abilities += 1
    expect(abilities).toBe(CUE_BUDGET.ability)
    let deaths = 0
    for (const type of PROJECTILE_NOVEL) if (cueEnemyDeathSfx(ENEMY_TYPE_CODES[type], 0, 0, 0, 0)) deaths += 1
    expect(deaths).toBe(CUE_BUDGET.death)
  })

  it('화면 밖(10u 초과) 좀비는 소리를 내지 않고, 멀수록 작다', () => {
    expect(cueEnemyAttackSfx(E61, HEAR_FAR_U + 0.5, 0, 0, 0)).toBe(false)
    expect(cueEnemyAttackSfx(E61, 1, 0, 0, 0)).toBe(true)
    fakeNow += 1000
    expect(cueEnemyAttackSfx(E61, 9, 0, 0, 0)).toBe(true)
    expect(heard[1].volume).toBeLessThan(heard[0].volume)
    expect(heard[1].volume).toBeGreaterThan(0)
  })

  it('표에 없는 타입은 무음, 등장음은 공용 펑으로 폴백한다', () => {
    expect(cueEnemyAttackSfx(ENEMY_TYPE_CODES.E01, 0, 0, 0, 0)).toBe(false)
    expect(cueEnemyTelegraphSfx(ENEMY_TYPE_CODES.E01, 0, 0, 0, 0)).toBe(false)
    expect(cueEnemySpawnSfx(ENEMY_TYPE_CODES.E01, 0, 0, 0, 0)).toBe(true)
    expect(heard[0].id).toBe(DEFAULT_SPAWN_SFX.id)
  })

  it('Math.random을 쓰지 않는다(시뮬레이션 결정성)', () => {
    const random = vi.spyOn(Math, 'random')
    cueEnemyAttackSfx(E34, 0, 0, 0, 0)
    cueEnemyDeathSfx(E61, 0, 0, 0, 0)
    cueShotImpactSfx(SHOT_KIND.DOMINO, 0, 0, 0, 0)
    expect(random).not.toHaveBeenCalled()
  })

  it('E51 합창은 연발 순번마다 음정이 올라간다', () => {
    const code = ENEMY_TYPE_CODES.E51
    const rates = []
    for (let shot = 1; shot <= 3; shot += 1) {
      fakeNow += 300
      cueEnemyAttackSfx(code, 0, 0, 0, 0, shot)
      rates.push(heard.at(-1).rate)
    }
    expect(rates[1]).toBeGreaterThan(rates[0])
    expect(rates[2]).toBeGreaterThan(rates[1])
  })
})

// ── 시뮬레이션 배선 ──────────────────────────────────────────────────────────
function createWorld() {
  return { pool: createEnemyEntityPool(), runtime: createEnemySimulationRuntime(), shots: createProjectileZombieShotPool(), handle: { index: -1, generation: 0 } }
}

function spawn(world, type, x, z, extra = {}) {
  const stats = ENEMY_STATS[type]
  const ok = world.pool.spawnInto(world.handle, {
    type, x, y: 0.3, z, hp: stats.hp, maxHp: stats.hp, visualScale: (stats.scale ?? 1) * ENEMY_SIZE_MULTIPLIER, ...extra,
  })
  expect(ok, `${type} spawn`).toBe(true)
  return { index: world.handle.index, generation: world.handle.generation }
}

function run(world, seconds, context = {}) {
  const event = {}
  const frames = Math.round(seconds / DT)
  for (let frame = 0; frame < frames; frame += 1) {
    fakeNow += DT * 1000
    world.runtime.step(world.pool, {
      delta: DT, playerX: 0, playerZ: 0, halfX: 60, halfZ: 60, elapsedSec: 30 + frame * DT,
      activeProjectileCount: 0, stageId: 'stage2', e04IntroSec: 0, bossPressure: false,
      projectileZombieShotCount: world.shots.hostileCount, ...context,
    })
    while (world.runtime.events.drainInto(event)) {
      if (event.type === ENEMY_EVENT_PROJECTILE_ZOMBIE_TELEGRAPH) spawnProjectileZombieTelegraphDecal(world.shots, world.pool, event.index, event.generation)
      else if (event.type === ENEMY_EVENT_PROJECTILE_ZOMBIE_FIRE) spawnProjectileZombieVolley(world.shots, world.pool, event.index, event.generation)
    }
    world.shots.step(DT, 0, 0, () => true, null, null)
  }
}

const ids = () => heard.map((event) => event.id)

describe('시뮬레이션이 실제로 신호를 낸다', () => {
  it('풀 스폰 첫 프레임에 등장음: E02 탱크 신음 / E03 러너 비명 / E06 쿵 / 그 밖은 펑', () => {
    const world = createWorld()
    for (const [type, x, z] of [['E02', 2, 0], ['E03', -2, 0], ['E06', 0, 2], ['E01', 0, -2]]) {
      spawn(world, type, x, z)
      run(world, DT)
      fakeNow += 500 // 등장음 창 예산(400ms에 2개)을 넘기지 않게 한 마리씩
    }
    expect(ids()).toEqual(expect.arrayContaining(['zombieTankGroan', 'zombieRunnerScreech', 'zombieGiantThud', 'zombieSpawn']))
    // 한 번만 — 다음 프레임부터는 등장음이 없다.
    const before = heard.length
    run(world, 0.5)
    expect(heard.slice(before).filter((event) => ['zombieTankGroan', 'zombieRunnerScreech', 'zombieGiantThud', 'zombieSpawn'].includes(event.id))).toHaveLength(0)
  })

  it('E04 발사·E05 돌진 경고가 들린다', () => {
    const world = createWorld()
    spawn(world, 'E04', 4.5, 0, { spawnTimer: 3000 })
    spawn(world, 'E05', -3, 0, { spawnTimer: 3000 })
    run(world, 4)
    expect(ids()).toContain('zombieRangedShoot')
    expect(ids()).toContain('zombieChargeRoar')
  })

  it.each(MELEE_NOVEL)('%s 근접 신규 좀비: 예고 뾰잉 → 공격음', (type) => {
    const world = createWorld()
    spawn(world, type, 1.0, 0.2, { spawnTimer: 3000 })
    run(world, 6)
    const entry = ENEMY_ABILITY_SFX[type]
    expect(ids(), type).toContain(entry.telegraph.id)
    expect(ids(), type).toContain(entry.attack.id)
  })

  it.each(['E46', 'E47', 'E48', 'E50', 'E51', 'E52', 'E53', 'E54', 'E55', 'E57', 'E59', 'E61', 'E62', 'E63', 'E64', 'E65', 'E68', 'E69', 'E70'])('%s 투사체 신규 좀비: 발사음', (type) => {
    const world = createWorld()
    spawn(world, type, 3.4, 0.3, { spawnTimer: 3000 })
    run(world, 9)
    expect(ids(), type).toContain(ENEMY_ABILITY_SFX[type].attack.id)
  })

  it.each([
    ['E49', (w) => spawn(w, 'E49', 3.4, 0.3, { spawnTimer: 3000 })],
    ['E58', (w) => spawn(w, 'E58', 2.0, 0.3, { spawnTimer: 3000 })],
    ['E60', (w) => spawn(w, 'E60', 2.0, 0.3, { spawnTimer: 3000 })],
    ['E66', (w) => spawn(w, 'E66', 3.0, 0.3, { spawnTimer: 3000, hp: 6, maxHp: 16 })],
    ['E56', (w) => { spawn(w, 'E56', 5.0, 0.3, { spawnTimer: 3000 }); spawn(w, 'E02', 5.5, 0.8, { spawnTimer: 3000, hp: 30, maxHp: 70 }) }],
    ['E67', (w) => { spawn(w, 'E67', 4.5, 0.3, { spawnTimer: 3000 }); spawn(w, 'E02', 5.0, 0.8, { spawnTimer: 3000 }) }],
  ])('%s 조건부 행동(물·매복·분열·회복·방패)도 발동하면 소리가 난다', (type, setup) => {
    const world = createWorld()
    setup(world)
    run(world, 10)
    expect(ids(), type).toContain(ENEMY_ABILITY_SFX[type].attack.id)
  })

  it('E69 도미노는 쓰러질 때 딱-딱-딱 연쇄로 울린다', () => {
    const world = createWorld()
    spawn(world, 'E69', 3.4, 0.3, { spawnTimer: 3000 })
    run(world, 9)
    // 발사(세우기) 1회 + 쓰러짐 연쇄. 도미노 간격 160ms > 간격 100ms라 연쇄가 이어 들린다.
    expect(heard.filter((event) => event.id === 'gagDominoClack').length).toBeGreaterThanOrEqual(3)
  })

  it('죽으면 사망 개그 한 겹(근접=슬픈 트롬본, 식판=쨍그랑)', () => {
    const world = createWorld()
    const a = spawn(world, 'E34', 1, 0, { spawnTimer: 3000 })
    run(world, DT)
    world.runtime.applyHitIndex(world.pool, a.index, a.generation, 1e6)
    expect(ids()).toContain('gagWahWah')
    fakeNow += 1000
    const b = spawn(world, 'E61', 1, 0, { spawnTimer: 3000 })
    world.runtime.applyHitIndex(world.pool, b.index, b.generation, 1e6)
    expect(ids()).toContain('gagTrayClatter')
  })

  it('살아남은 피격은 사망 개그를 내지 않는다', () => {
    const world = createWorld()
    const a = spawn(world, 'E61', 1, 0, { spawnTimer: 3000 })
    world.runtime.applyHitIndex(world.pool, a.index, a.generation, 1)
    expect(ids()).not.toContain('gagTrayClatter')
  })

  it('가까운 좀비가 있으면 몇 초마다 앰비언트 신음을 한 번 낸다', () => {
    const world = createWorld()
    spawn(world, 'E01', 3, 0, { spawnTimer: 3000, hp: 1e9, maxHp: 1e9 })
    run(world, 20)
    const groans = heard.filter((event) => event.id === AMBIENT_GROAN_SFX.id).length
    expect(groans).toBeGreaterThanOrEqual(2)
    expect(groans).toBeLessThanOrEqual(4)
  })

  it('착지·폭발 신호: 퓨즈 우유갑이 터질 때 펑', () => {
    const shots = createProjectileZombieShotPool()
    const spec = createShotSpec()
    spec.kind = SHOT_KIND.MILK_CARTON; spec.motion = SHOT_MOTION.FUSE; spec.speed = 0; spec.damage = 6
    spec.lifeMs = 2000; spec.hitRadius = 0.1; spec.p0 = 0; spec.p1 = 300; spec.p2 = 0.7; spec.p3 = 0
    expect(shots.spawn(2, 0, 1, 0, spec)).toBeGreaterThanOrEqual(0)
    for (let frame = 0; frame < 40; frame += 1) { fakeNow += 16; shots.step(DT, 0, 0, () => true) }
    expect(ids()).toContain(SHOT_IMPACT_SFX[SHOT_KIND.MILK_CARTON].id)
  })
})
