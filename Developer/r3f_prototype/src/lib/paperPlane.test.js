import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { WEAPON_CATALOG, isStarter } from './weaponCatalog.js'
import { UPGRADE_EFFECTS, applyUpgradeToWeapon, isUpgradeAvailable } from './upgrades.js'
import { estimatePlayerDps } from './playerDpsEstimate.js'
import {
  E47_PAPER_PLANE_SHOT, PAPER_PLANE_CONTACT_RADIUS, PAPER_PLANE_LIFETIME_MS, PAPER_PLANE_SPEED,
  PAPER_PLANE_TURN_BUDGET, PAPER_PLANE_TURN_RATE, countActivePaperPlanes, createPaperPlanePool,
  launchPaperPlanes, spawnPaperPlane, stepPaperPlanes,
} from './paperPlane.js'
import { PROJECTILE_ZOMBIE_BEHAVIORS } from './projectileZombieBehavior.js'
import {
  SHOT_HEIGHT, SHOT_KIND, SHOT_KIND_INFO, SHOT_MOTION, createProjectileZombieShotPool, steerHomingVelocity,
} from './projectileZombieShotPool.js'
import { PLAYER_CONTACT_HALF_EXTENT } from './enemyProjectilePool.js'
import en from './locales/en.js'
import ja from './locales/ja.js'

const DT = 1 / 60
const DEG = Math.PI / 180

// 가짜 적 세계: 풀 인덱스 = 배열 인덱스, 세대 1 고정. 거리 계산은 실제 스캔과 같은 의미로 흉내 낸다.
function makeWorld(points) {
  const enemies = points.map(([x, z], index) => ({ index, x, z, hits: 0, alive: true, rb: null }))
  for (const e of enemies) e.rb = { translation: () => ({ x: e.x, y: 0, z: e.z }) }
  const fill = (scratch, list, limit) => {
    const n = Math.min(list.length, limit, scratch.indices.length)
    for (let k = 0; k < n; k += 1) {
      scratch.indices[k] = list[k].e.index
      scratch.generations[k] = 1
      scratch.special[k] = null
    }
    scratch.count = n
    return n
  }
  const deps = {
    resolveTarget: (index, generation) => (enemies[index]?.alive && generation === 1 ? enemies[index].rb : null),
    scanRadius: (scratch, x, z, r, limit) => fill(scratch, enemies
      .filter((e) => e.alive && Math.hypot(e.x - x, e.z - z) <= r)
      .map((e) => ({ e, d: Math.hypot(e.x - x, e.z - z) }))
      .sort((a, b) => a.d - b.d), limit),
    applyHit: (rb, generation, damage) => {
      const e = enemies.find((it) => it.rb === rb)
      if (!e?.alive) return false
      e.hits += 1
      e.damage = (e.damage ?? 0) + damage
      return true
    },
  }
  return { enemies, deps }
}

function run(pool, deps, seconds, dt = DT) {
  let hits = 0
  for (let t = 0; t < seconds; t += dt) hits += stepPaperPlanes(pool, dt, deps)
  return hits
}

const scratchOf = (n) => ({ indices: new Int16Array(n), generations: new Uint16Array(n), special: new Array(n) })
const headingDeg = (pool, i) => Math.atan2(pool.velX[i], pool.velZ[i]) / DEG

describe('paper plane weapon — catalog & cards', () => {
  it('is a Stage-1 level-up weapon (account starter, not active at run start) with levels 1–5', () => {
    const entry = WEAPON_CATALOG.paperPlane
    expect(isStarter('paperPlane')).toBe(true)
    expect(entry.startsActive).toBeUndefined()
    expect(entry.minLevelToAppear).toBe(1)
    expect(UPGRADE_EFFECTS.acquirePaperPlane).toMatchObject({ weapon: 'paperPlane', kind: 'acquire', minLevel: 1 })
    // Lv1 획득 카드는 플레이어 레벨 1부터 후보가 된다.
    const weapons = { paperPlane: { ...entry.base, active: false } }
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquirePaperPlane, 1, weapons)).toBe(true)
  })

  it('levels 2–5 add damage, plane count and pierce; Lv5 single-target DPS = 4× Lv1 (damage ×2, planes ×2)', () => {
    let w = applyUpgradeToWeapon({ ...WEAPON_CATALOG.paperPlane.base }, UPGRADE_EFFECTS.acquirePaperPlane)
    expect(w.level).toBe(1)
    const lv1 = estimatePlayerDps({ paperPlane: w })
    for (const key of ['paperPlaneDamage', 'paperPlaneCount', 'paperPlanePierce', 'paperPlanePower']) {
      expect(isUpgradeAvailable(UPGRADE_EFFECTS[key], 10, { paperPlane: w })).toBe(true)
      w = applyUpgradeToWeapon(w, UPGRADE_EFFECTS[key])
    }
    // 관통: 기본 1(한 번 맞히고 사라짐) + 카드 1 = 2(맞힌 좀비를 뚫고 뒤의 좀비 하나 더).
    expect(WEAPON_CATALOG.paperPlane.base.pierce).toBe(1)
    expect(UPGRADE_EFFECTS.paperPlanePierce.cap).toBe(4)
    expect(w).toMatchObject({ level: 5, damage: 18, projectileCount: 2, pierce: 2 })
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.paperPlaneDamage, 10, { paperPlane: w })).toBe(false)
    const lv5 = estimatePlayerDps({ paperPlane: w })
    expect(lv1).toBeCloseTo((9 / 1.8) * 1.025, 9)
    expect(lv5).toBeCloseTo((18 / 1.8) * 2 * 1.025, 9)
    expect(lv5 / lv1).toBeCloseTo(4, 9)
  })

  it('sits mid-tier: Lv1 single-target DPS between pencil and onigiri, existing weapons untouched', () => {
    const dps = (id) => estimatePlayerDps({ [id]: { ...WEAPON_CATALOG[id].base, active: true } })
    expect(dps('paperPlane')).toBeGreaterThan(dps('pencilThrow'))
    expect(dps('paperPlane')).toBeLessThan(dps('onigiri'))
    expect(WEAPON_CATALOG.guidedMissile.base).toMatchObject({ damage: expect.any(Number) })
    expect(WEAPON_CATALOG.pencilThrow.base.damage).toBe(2.4)
    expect(WEAPON_CATALOG.onigiri.base.damage).toBe(52.5)
    expect(WEAPON_CATALOG.miniRosari.base.damage).toBe(34)
  })

  it('has ko (HUD) / en / ja card names and descriptions and an icon', () => {
    const hud = readFileSync(new URL('../components/HUD.jsx', import.meta.url), 'utf8')
    for (const key of ['acquirePaperPlane', 'paperPlaneDamage', 'paperPlaneCount', 'paperPlanePierce', 'paperPlanePower']) {
      expect(hud).toContain(`key: '${key}'`)
      for (const dict of [en, ja]) {
        expect(dict[`up.${key}.label`]).toBeTruthy()
        expect(dict[`up.${key}.desc`]).toBeTruthy()
      }
    }
    expect(en['weapon.paperPlane']).toBe('Paper Plane')
    expect(ja['weapon.paperPlane']).toBe('紙飛行機')
    expect(hud).toContain("paperPlane: paperPlaneIconSrc")
  })
})

describe('paper plane flight = the E47 zombie paper plane (2026-11-08 Terry)', () => {
  it('takes speed, lifetime, turn rate, turn budget and contact distance from the E47 shot spec', () => {
    const e47 = Object.values(PROJECTILE_ZOMBIE_BEHAVIORS).find((b) => b.id === 'E47').shot
    expect(E47_PAPER_PLANE_SHOT).toBe(e47)
    expect(e47).toMatchObject({ kind: SHOT_KIND.PAPER_PLANE, motion: SHOT_MOTION.HOMING })
    expect(PAPER_PLANE_SPEED).toBe(e47.speed)
    expect(PAPER_PLANE_LIFETIME_MS).toBe(e47.lifeMs)
    expect(PAPER_PLANE_TURN_RATE).toBe(e47.p0)
    expect(PAPER_PLANE_TURN_BUDGET).toBe(e47.p1)
    expect(PAPER_PLANE_CONTACT_RADIUS).toBe(e47.hitRadius + PLAYER_CONTACT_HALF_EXTENT)
    // 지금 E47 값: 1.6u/s, 4.2초, 초당 45°, 누적 90°, 접촉 0.256u.
    expect(PAPER_PLANE_SPEED).toBe(1.6)
    expect(PAPER_PLANE_LIFETIME_MS).toBe(4200)
    expect(PAPER_PLANE_TURN_RATE).toBeCloseTo(45 * DEG, 12)
    expect(PAPER_PLANE_TURN_BUDGET).toBeCloseTo(90 * DEG, 12)
    expect(PAPER_PLANE_CONTACT_RADIUS).toBeCloseTo(0.256, 12)
  })

  it('flies the exact path an E47 shot flies toward Rosari (same steering code), for still and moving targets', () => {
    // 표적은 비행거리(6.72u) 밖에 둬 수명이 끝날 때까지 궤적만 비교한다.
    const scenarios = [
      { dir: [0, 1], target: () => [6, 5] },
      { dir: [1, 0], target: (t) => [-3 + 0.6 * t, 6 - 0.4 * t] },
      { dir: [-0.4, -1], target: (t) => [4 * Math.sin(t), 5 + Math.cos(1.3 * t)] },
    ]
    for (const sc of scenarios) {
      const shots = createProjectileZombieShotPool()
      const zombie = shots.spawn(0, 0, sc.dir[0], sc.dir[1], { ...E47_PAPER_PLANE_SHOT })
      const [x0, z0] = sc.target(0)
      const { enemies, deps } = makeWorld([[x0, z0]])
      const pool = createPaperPlanePool(2)
      const plane = spawnPaperPlane(pool, { x: 0, z: 0, dirX: sc.dir[0], dirZ: sc.dir[1], damage: 1, targetIndex: 0, targetGeneration: 1 })
      let steps = 0
      let turned = 0
      for (let k = 0; k < 400; k += 1) {
        const [tx, tz] = sc.target((k + 1) * DT)
        enemies[0].x = tx
        enemies[0].z = tz
        shots.step(DT, tx, tz, () => true)
        stepPaperPlanes(pool, DT, deps)
        // 같은 스텝에 같이 사라진다(수명 4.2초).
        expect(pool.active[plane]).toBe(shots.active[zombie])
        if (!shots.active[zombie]) break
        expect(pool.posX[plane]).toBe(shots.posX[zombie])
        expect(pool.posZ[plane]).toBe(shots.posZ[zombie])
        expect(pool.velX[plane]).toBe(shots.velX[zombie])
        expect(pool.velZ[plane]).toBe(shots.velZ[zombie])
        expect(pool.turnLeft[plane]).toBe(shots.p1[zombie])
        turned = PAPER_PLANE_TURN_BUDGET - pool.turnLeft[plane]
        steps += 1
      }
      expect(steps * DT).toBeGreaterThan(4.15)
      expect(steps * DT).toBeLessThan(4.25)
      expect(turned).toBeGreaterThan(10 * DEG) // 실제로 꺾으며 날았다
      expect(enemies[0].hits).toBe(0)
    }
  })

  it('turns at most 45°/s and at most 90° in total, then flies straight', () => {
    const { deps } = makeWorld([[0, -5]]) // 바로 뒤의 표적: 최대 선회 속도로 꺾는다
    const pool = createPaperPlanePool(1)
    spawnPaperPlane(pool, { x: 0, z: 0, dirX: 0, dirZ: 1, damage: 1, targetIndex: 0, targetGeneration: 1 })
    run(pool, deps, 1 - DT / 2)
    expect(Math.abs(headingDeg(pool, 0))).toBeCloseTo(45, 3)
    run(pool, deps, 1)
    expect(Math.abs(headingDeg(pool, 0))).toBeCloseTo(90, 3)
    expect(pool.turnLeft[0]).toBeLessThan(1e-6)
    const before = headingDeg(pool, 0)
    run(pool, deps, 1)
    expect(headingDeg(pool, 0)).toBeCloseTo(before, 6)
    // 속력은 그대로 1.6u/s.
    expect(Math.hypot(pool.velX[0], pool.velZ[0])).toBeCloseTo(PAPER_PLANE_SPEED, 5)
  })

  it('base plane (pierce 1) hits the first enemy it touches once and disappears, like E47', () => {
    const { enemies, deps } = makeWorld([[0, 1.5], [0, 2.5], [0, 3.5]])
    const pool = createPaperPlanePool(2)
    const scratch = scratchOf(4)
    const n = deps.scanRadius(scratch, 0, 0, 9, 1)
    const weapon = { ...WEAPON_CATALOG.paperPlane.base }
    expect(weapon.pierce).toBe(1)
    expect(launchPaperPlanes(pool, { originX: 0, originZ: 0, weapon, scratch, targetCount: n, resolveTarget: deps.resolveTarget })).toBe(1)
    run(pool, deps, 3)
    expect(enemies.map((e) => e.hits)).toEqual([1, 0, 0])
    expect(enemies[0].damage).toBe(weapon.damage)
    expect(countActivePaperPlanes(pool)).toBe(0)
  })

  it('each pierce passes through the hit zombie on the same heading and hits the next one behind', () => {
    for (const [pierce, expected] of [[2, [1, 1, 0, 0]], [3, [1, 1, 1, 0]], [4, [1, 1, 1, 1]]]) {
      const { enemies, deps } = makeWorld([[0, 1.2], [0, 2.0], [0, 2.8], [0, 3.6]])
      const pool = createPaperPlanePool(2)
      const slot = spawnPaperPlane(pool, { x: 0, z: 0, dirX: 0, dirZ: 1, damage: 9, pierce, targetIndex: 0, targetGeneration: 1 })
      const speeds = []
      for (let t = 0; t < 3.2 && pool.active[slot]; t += DT) {
        stepPaperPlanes(pool, DT, deps)
        if (pool.active[slot]) {
          speeds.push(Math.hypot(pool.velX[slot], pool.velZ[slot]))
          // 일렬로 선 좀비를 뚫는 동안 방향이 바뀌지 않는다(꺾을 이유가 없다).
          expect(Math.abs(pool.velX[slot])).toBeLessThan(1e-6)
        }
      }
      expect(enemies.map((e) => e.hits)).toEqual(expected)
      for (const s of speeds) expect(s).toBeCloseTo(PAPER_PLANE_SPEED, 5)
      if (pierce < 4) expect(countActivePaperPlanes(pool)).toBe(0) // 다 쓰면 사라진다
    }
  })

  it('a piercing plane keeps the same lifetime, flies straight after a hit, and never hits the same zombie twice', () => {
    // 뚫고 지나간 첫 좀비가 비행기 바로 옆(반경 안)에 계속 붙어 있어도 다시 맞지 않는다.
    const { enemies, deps } = makeWorld([[0, 1]])
    const pool = createPaperPlanePool(1)
    const slot = spawnPaperPlane(pool, { x: 0, z: 0, dirX: 0, dirZ: 1, damage: 9, pierce: 4, targetIndex: 0, targetGeneration: 1 })
    let age = 0
    while (pool.active[slot] && age < 6) {
      stepPaperPlanes(pool, DT, deps)
      age += DT
      // 좀비가 비행기를 따라다닌다(같은 자리에서 계속 접촉).
      enemies[0].x = pool.posX[slot]; enemies[0].z = pool.posZ[slot]
    }
    expect(enemies[0].hits).toBe(1)
    // 맞힐 적이 남아 있지 않으면 수명(4.2초)까지 날고 사라진다.
    expect(age).toBeGreaterThan(4.15)
    expect(age).toBeLessThan(4.25)
    // 뚫고 지나간 뒤에는 옆의 좀비를 쫓아 꺾지 않고 연필처럼 그 방향 그대로 직진한다.
    const w2 = makeWorld([[0, 1], [-3, 2]])
    const p2 = createPaperPlanePool(1)
    spawnPaperPlane(p2, { x: 0, z: 0, dirX: 0, dirZ: 1, damage: 9, pierce: 2, targetIndex: 0, targetGeneration: 1 })
    let afterHit = null
    for (let t = 0; t < 4.3 && p2.active[0]; t += DT) {
      stepPaperPlanes(p2, DT, w2.deps)
      if (!p2.active[0]) break
      if (w2.enemies[0].hits === 1 && afterHit === null) afterHit = headingDeg(p2, 0)
      if (afterHit !== null) expect(headingDeg(p2, 0)).toBe(afterHit)
    }
    expect(w2.enemies[0].hits).toBe(1)
    expect(w2.enemies[1].hits).toBe(0)
    expect(afterHit).not.toBeNull()
  })

  it('two piercing planes may each hit the same zombie once (no double hit per plane)', () => {
    const { enemies, deps } = makeWorld([[0, 2], [0, 2.8]])
    const pool = createPaperPlanePool(2)
    spawnPaperPlane(pool, { x: 0, z: 0, dirX: 0, dirZ: 1, damage: 9, pierce: 2, targetIndex: 0, targetGeneration: 1 })
    spawnPaperPlane(pool, { x: 0.05, z: 0, dirX: 0, dirZ: 1, damage: 9, pierce: 2, targetIndex: 0, targetGeneration: 1 })
    run(pool, deps, 3)
    expect(enemies.map((e) => e.hits)).toEqual([2, 2])
  })

  it('touches at the zombie plane contact distance (0.12 + 0.136 = 0.256u)', () => {
    for (const [offset, expected] of [[0.25, 1], [0.27, 0]]) {
      const { enemies, deps } = makeWorld([[offset, 2]])
      const pool = createPaperPlanePool(1)
      const slot = spawnPaperPlane(pool, { x: 0, z: 0, dirX: 0, dirZ: 1, damage: 1 })
      pool.turnLeft[slot] = 0 // 선회 없이 직진: 옆으로 비낀 거리만 본다
      run(pool, deps, 2)
      expect(enemies[0].hits).toBe(expected)
    }
  })

  it('when its target dies first, it steers at the nearest other enemy within the remaining turn budget', () => {
    const { enemies, deps } = makeWorld([[0, 3], [0.5, 3]])
    const pool = createPaperPlanePool(1)
    spawnPaperPlane(pool, { x: 0, z: 0, dirX: 0, dirZ: 1, damage: 1, targetIndex: 0, targetGeneration: 1 })
    run(pool, deps, 0.2)
    enemies[0].alive = false // 다른 무기에 먼저 죽었다
    run(pool, deps, 3)
    expect(enemies[1].hits).toBe(1)
    expect(countActivePaperPlanes(pool)).toBe(0)
  })

  it('launches from Rosari\'s exact position toward the nearest enemies, one plane per target', () => {
    const { enemies, deps } = makeWorld([[0, 4], [3, 0]])
    const pool = createPaperPlanePool(4)
    const scratch = scratchOf(4)
    const n = deps.scanRadius(scratch, 0, 0, 9, 2)
    const launched = launchPaperPlanes(pool, { originX: 0, originZ: 0, weapon: { ...WEAPON_CATALOG.paperPlane.base, projectileCount: 2 }, scratch, targetCount: n, resolveTarget: deps.resolveTarget })
    expect(launched).toBe(2)
    for (let i = 0; i < 2; i += 1) {
      expect(pool.posX[i]).toBe(0)
      expect(pool.posZ[i]).toBe(0)
    }
    // 첫 비행기는 가까운 (3,0), 둘째는 (0,4) 쪽으로 출발한다.
    expect(headingDeg(pool, 0)).toBeCloseTo(90, 4)
    expect(headingDeg(pool, 1)).toBeCloseTo(0, 4)
    run(pool, deps, 3.5)
    expect(enemies[0].hits).toBe(1)
    expect(enemies[1].hits).toBe(1)
  })

  it('sends every plane at a lone target, and the DPS estimate counts every plane (Matilda HP)', () => {
    const { enemies, deps } = makeWorld([[0, 4]])
    const pool = createPaperPlanePool(4)
    const scratch = scratchOf(4)
    const n = deps.scanRadius(scratch, 0, 0, 9, 2)
    expect(n).toBe(1)
    expect(launchPaperPlanes(pool, { originX: 0, originZ: 0, weapon: { ...WEAPON_CATALOG.paperPlane.base, projectileCount: 2 }, scratch, targetCount: n, resolveTarget: deps.resolveTarget })).toBe(2)
    run(pool, deps, 4)
    expect(enemies[0].hits).toBe(2) // 두 대 모두 같은 적을 한 번씩
    expect(WEAPON_CATALOG.paperPlane.base.singleTargetProjectiles).toBe(true)
    const base = { ...WEAPON_CATALOG.paperPlane.base, active: true }
    expect(estimatePlayerDps({ paperPlane: { ...base, projectileCount: 2 } })).toBeCloseTo(2 * estimatePlayerDps({ paperPlane: base }), 9)
  })

  it('expires after 4.2 s (6.72u) when it touches nothing', () => {
    const { deps } = makeWorld([])
    const pool = createPaperPlanePool(1)
    spawnPaperPlane(pool, { x: 0, z: 0, dirX: 1, dirZ: 0, damage: 1 })
    run(pool, deps, 4.1)
    expect(countActivePaperPlanes(pool)).toBe(1)
    expect(pool.posX[0]).toBeCloseTo(1.6 * 4.1, 1)
    run(pool, deps, 0.15)
    expect(countActivePaperPlanes(pool)).toBe(0)
  })

  it('shares the zombie steering function: clamps by rate×dt and by budget, picks the target side', () => {
    const out = { x: 0, z: 0 }
    // 목표가 +x 쪽(오른쪽)이면 +회전, 한 스텝 최대 rate×dt.
    const used = steerHomingVelocity(0, 1.6, 3, 0, 45 * DEG, 90 * DEG, DT, out)
    expect(used).toBeCloseTo(45 * DEG * DT, 12)
    expect(out.x).toBeGreaterThan(0)
    // 예산이 더 작으면 예산만큼만.
    expect(steerHomingVelocity(0, 1.6, 3, 0, 45 * DEG, 0.001, DT, out)).toBeCloseTo(0.001, 12)
    // 이미 정면이면 꺾지 않는다.
    expect(steerHomingVelocity(0, 1.6, 0, 3, 45 * DEG, 90 * DEG, DT, out)).toBe(0)
  })

  it('has no cap on simultaneous planes: the pool grows instead of dropping launches', () => {
    const pool = createPaperPlanePool(2)
    for (let i = 0; i < 9; i += 1) spawnPaperPlane(pool, { x: 0, z: 0, dirX: 1, dirZ: 0, damage: 1 })
    expect(countActivePaperPlanes(pool)).toBe(9)
    expect(pool.capacity).toBeGreaterThanOrEqual(9)
  })

  it('steady-state stepping does not grow the pool or reallocate its arrays', () => {
    const { deps } = makeWorld([[0, 30]])
    const pool = createPaperPlanePool(4)
    spawnPaperPlane(pool, { x: 0, z: 0, dirX: 0, dirZ: 1, damage: 1, targetIndex: 0, targetGeneration: 1 })
    const before = pool.posX
    run(pool, deps, 1)
    expect(pool.posX).toBe(before)
    expect(pool.capacity).toBe(4)
  })
})

describe('paper plane visual = the zombie paper plane + a mint outline', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('uses the E47 shot mesh unchanged (vertices, indices, colours) at the same size', async () => {
    const { SHOT_VISUALS, createShotGeometries, getShotVisualIndex } = await import('./projectileZombieShotGeometry.js')
    const { PAPER_PLANE_VISUAL, PAPER_PLANE_VISUAL_SCALE } = await import('../components/Weapons/PaperPlane.jsx')
    expect(PAPER_PLANE_VISUAL).toBe(getShotVisualIndex(SHOT_KIND.PAPER_PLANE, SHOT_MOTION.HOMING))
    expect(SHOT_VISUALS[PAPER_PLANE_VISUAL].key).toBe('paperPlane')
    expect(PAPER_PLANE_VISUAL_SCALE).toBe(SHOT_KIND_INFO[SHOT_KIND.PAPER_PLANE].size)
    expect(PAPER_PLANE_VISUAL_SCALE).toBe(1.35)
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) })
    const { getPaperPlaneAssets } = await import('../components/Weapons/PaperPlane.jsx')
    const weapon = getPaperPlaneAssets().bodyGeo
    const enemy = createShotGeometries()[PAPER_PLANE_VISUAL]
    for (const name of ['position', 'normal', 'color']) {
      expect(Array.from(weapon.attributes[name].array)).toEqual(Array.from(enemy.attributes[name].array))
    }
    expect(Array.from(weapon.index.array)).toEqual(Array.from(enemy.index.array))
  })

  it('writes exactly the matrix the zombie shot layer writes for the same position, heading and age', async () => {
    const { createProjectileZombieShotMeshes, writeProjectileZombieShotFrame } = await import('../components/PooledEnemyProjectileLayer.jsx')
    const { PAPER_PLANE_VISUAL, writePlaneMatrices } = await import('../components/Weapons/PaperPlane.jsx')
    const shots = createProjectileZombieShotMeshes({
      bodyMat: new THREE.MeshBasicMaterial({ vertexColors: true }),
      outMat: new THREE.MeshBasicMaterial({ side: THREE.BackSide }),
      decalMats: [0, 1, 2, 3].map(() => new THREE.MeshBasicMaterial()),
    })
    const shotPool = createProjectileZombieShotPool()
    const zSlot = shotPool.spawn(1.2, -0.7, 0.6, 0.8, { ...E47_PAPER_PLANE_SHOT })
    shotPool.ageMs[zSlot] = 1234
    writeProjectileZombieShotFrame(shots, shotPool, null, { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, { x: 0, z: 0 })
    const zombieMatrix = new THREE.Matrix4()
    shots.shotBodies[PAPER_PLANE_VISUAL].getMatrixAt(0, zombieMatrix)

    const pool = createPaperPlanePool(2)
    const slot = spawnPaperPlane(pool, { x: 1.2, z: -0.7, dirX: 0.6, dirZ: 0.8, damage: 1 })
    expect(slot).toBe(zSlot)
    pool.ageMs[slot] = 1234
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const body = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial(), 2)
    const outline = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial(), 2)
    writePlaneMatrices(pool, body, outline)
    const weaponMatrix = new THREE.Matrix4()
    body.getMatrixAt(0, weaponMatrix)
    expect(weaponMatrix.elements).toEqual(zombieMatrix.elements)
    // 높이도 좀비 탄과 같다.
    expect(weaponMatrix.elements[13]).toBeCloseTo(SHOT_HEIGHT, 6)
    geometry.dispose()
  })

  it('differs only in the outline colour: mint for Rosari, the zombie outline stays near-black', async () => {
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) })
    const {
      SHOT_BODY_EMISSIVE, SHOT_OUTLINE_COLOR, SHOT_OUTLINE_THICKNESS, createShotOutlineMaterial,
    } = await import('./projectileZombieShotGeometry.js')
    const { PAPER_PLANE_OUTLINE_COLOR, PAPER_PLANE_OUTLINE_THICKNESS, getPaperPlaneAssets } = await import('../components/Weapons/PaperPlane.jsx')
    const assets = getPaperPlaneAssets()
    expect(assets.outlineMat.color.getHex()).toBe(new THREE.Color(PAPER_PLANE_OUTLINE_COLOR).getHex())
    expect(PAPER_PLANE_OUTLINE_COLOR).not.toBe(SHOT_OUTLINE_COLOR)
    expect(PAPER_PLANE_OUTLINE_COLOR).not.toBe(0x34d6b8) // E04 청록 탄과도 다르다
    expect(PAPER_PLANE_OUTLINE_THICKNESS).toBeGreaterThanOrEqual(SHOT_OUTLINE_THICKNESS)
    expect(assets.outlineMat.side).toBe(THREE.BackSide)
    expect(assets.outlineMat.transparent).toBe(true)
    expect(assets.outlineMat.depthWrite).toBe(false)
    expect(assets.bodyMat.vertexColors).toBe(true)
    expect(assets.bodyMat.emissive.getHex()).toBe(new THREE.Color(SHOT_BODY_EMISSIVE).getHex())
    // 좀비 탄 외곽선 재질은 그대로(거의 검정)다.
    expect(SHOT_OUTLINE_COLOR).toBe(0x050209)
    expect(createShotOutlineMaterial().color.getHex()).toBe(new THREE.Color(0x050209).getHex())
    const layer = readFileSync(new URL('../components/PooledEnemyProjectileLayer.jsx', import.meta.url), 'utf8')
    expect(layer).toContain('outMat: createShotOutlineMaterial(),')
  })
})
