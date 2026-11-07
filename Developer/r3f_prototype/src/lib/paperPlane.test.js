import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { WEAPON_CATALOG, isStarter } from './weaponCatalog.js'
import { UPGRADE_EFFECTS, applyUpgradeToWeapon, isUpgradeAvailable } from './upgrades.js'
import { estimatePlayerDps } from './playerDpsEstimate.js'
import {
  PAPER_PLANE_LIFETIME_MS, PAPER_PLANE_SPEED, countActivePaperPlanes, createPaperPlanePool,
  launchPaperPlanes, spawnPaperPlane, stepPaperPlanes,
} from './paperPlane.js'
import en from './locales/en.js'
import ja from './locales/ja.js'

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
    scanSweep: (scratch, fx, fz, tx, tz, r, limit) => {
      const dx = tx - fx; const dz = tz - fz; const l2 = dx * dx + dz * dz || 1
      return fill(scratch, enemies.filter((e) => {
        if (!e.alive) return false
        const t = Math.max(0, Math.min(1, ((e.x - fx) * dx + (e.z - fz) * dz) / l2))
        return Math.hypot(fx + dx * t - e.x, fz + dz * t - e.z) <= r
      }).map((e) => ({ e })), limit)
    },
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

function run(pool, deps, seconds, dt = 1 / 60) {
  let hits = 0
  for (let t = 0; t < seconds; t += dt) hits += stepPaperPlanes(pool, dt, deps)
  return hits
}

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
    expect(w).toMatchObject({ level: 5, damage: 18, projectileCount: 2, pierce: 4 })
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

describe('paper plane flight', () => {
  it('launches from Rosari toward the nearest enemies, one plane per target', () => {
    const { enemies, deps } = makeWorld([[0, 4], [3, 0]])
    const pool = createPaperPlanePool(4)
    const scratch = { indices: new Int16Array(4), generations: new Uint16Array(4), special: new Array(4) }
    const n = deps.scanRadius(scratch, 0, 0, 9, 2)
    const launched = launchPaperPlanes(pool, { originX: 0, originZ: 0, weapon: { ...WEAPON_CATALOG.paperPlane.base, projectileCount: 2 }, scratch, targetCount: n, resolveTarget: deps.resolveTarget })
    expect(launched).toBe(2)
    for (let i = 0; i < 2; i += 1) expect(Math.hypot(pool.posX[i], pool.posZ[i])).toBeLessThan(0.5)
    run(pool, deps, 1.5)
    // 각자 자기 표적을 먼저 맞힌 뒤, 관통이 남은 비행기는 다른 적(남의 표적)을 쫓아 한 번 더 맞힌다.
    // 같은 비행기가 같은 적을 두 번 맞히지는 않으므로 적 하나당 최대 2타(비행기 2대).
    expect(enemies[0].hits).toBeGreaterThanOrEqual(1)
    expect(enemies[1].hits).toBeGreaterThanOrEqual(1)
    expect(enemies[0].hits).toBeLessThanOrEqual(2)
    expect(enemies[1].hits).toBeLessThanOrEqual(2)
  })

  it('sends every plane at a lone target, and the DPS estimate counts every plane (Matilda HP)', () => {
    const { enemies, deps } = makeWorld([[0, 4]])
    const pool = createPaperPlanePool(4)
    const scratch = { indices: new Int16Array(4), generations: new Uint16Array(4), special: new Array(4) }
    const n = deps.scanRadius(scratch, 0, 0, 9, 2)
    expect(n).toBe(1)
    expect(launchPaperPlanes(pool, { originX: 0, originZ: 0, weapon: { ...WEAPON_CATALOG.paperPlane.base, projectileCount: 2 }, scratch, targetCount: n, resolveTarget: deps.resolveTarget })).toBe(2)
    run(pool, deps, 2)
    expect(enemies[0].hits).toBe(2) // 두 대 모두 같은 적을 한 번씩
    expect(WEAPON_CATALOG.paperPlane.base.singleTargetProjectiles).toBe(true)
    const base = { ...WEAPON_CATALOG.paperPlane.base, active: true }
    expect(estimatePlayerDps({ paperPlane: { ...base, projectileCount: 2 } })).toBeCloseTo(2 * estimatePlayerDps({ paperPlane: base }), 9)
  })

  it('pierces up to `pierce` distinct enemies, never the same one twice, then disappears', () => {
    const { enemies, deps } = makeWorld([[0, 2], [0, 3], [0, 4], [0, 5], [0, 6]])
    const pool = createPaperPlanePool(2)
    spawnPaperPlane(pool, { x: 0, z: 0, dirX: 0, dirZ: 1, damage: 9, pierce: 3, targetIndex: 0, targetGeneration: 1 })
    run(pool, deps, 3)
    expect(enemies.map((e) => e.hits)).toEqual([1, 1, 1, 0, 0])
    expect(countActivePaperPlanes(pool)).toBe(0)
  })

  it('a plane with hits left chases the next enemy (turning back) until its lifetime ends', () => {
    // 첫 표적을 지나친 뒤 뒤쪽(-x)에 있는 적에게 되돌아가야 한다.
    const { enemies, deps } = makeWorld([[0, 2], [-2.5, 1]])
    const pool = createPaperPlanePool(2)
    spawnPaperPlane(pool, { x: 0, z: 0, dirX: 0, dirZ: 1, damage: 9, pierce: 3, targetIndex: 0, targetGeneration: 1 })
    run(pool, deps, 3)
    expect(enemies[0].hits).toBe(1)
    expect(enemies[1].hits).toBe(1)
    // 맞힐 수 있는 적이 없어도 수명까지는 날아가고, 수명이 끝나면 사라진다.
    expect(countActivePaperPlanes(pool)).toBe(1)
    run(pool, deps, PAPER_PLANE_LIFETIME_MS / 1000)
    expect(countActivePaperPlanes(pool)).toBe(0)
  })

  it('glides (bounded turn rate) instead of snapping to the target', () => {
    const { deps } = makeWorld([[5, 0]])
    const pool = createPaperPlanePool(1)
    spawnPaperPlane(pool, { x: 0, z: 0, dirX: 0, dirZ: 1, damage: 1, pierce: 1, targetIndex: 0, targetGeneration: 1 })
    stepPaperPlanes(pool, 1 / 60, deps)
    // 한 스텝 뒤에도 여전히 대부분 +Z를 향한다(90° 즉시 꺾기 금지).
    expect(pool.dirZ[0]).toBeGreaterThan(0.99)
    expect(Math.hypot(pool.posX[0], pool.posZ[0])).toBeCloseTo(PAPER_PLANE_SPEED / 60, 5)
  })

  it('has no cap on simultaneous planes: the pool grows instead of dropping launches', () => {
    const pool = createPaperPlanePool(2)
    for (let i = 0; i < 9; i += 1) spawnPaperPlane(pool, { x: 0, z: 0, dirX: 1, dirZ: 0, damage: 1, pierce: 1 })
    expect(countActivePaperPlanes(pool)).toBe(9)
    expect(pool.capacity).toBeGreaterThanOrEqual(9)
  })

  it('steady-state stepping does not grow the pool or reallocate its arrays', () => {
    const { deps } = makeWorld([[0, 30]])
    const pool = createPaperPlanePool(4)
    spawnPaperPlane(pool, { x: 0, z: 0, dirX: 0, dirZ: 1, damage: 1, pierce: 2, targetIndex: 0, targetGeneration: 1 })
    const before = pool.posX
    run(pool, deps, 1)
    expect(pool.posX).toBe(before)
    expect(pool.capacity).toBe(4)
  })
})

describe('paper plane visual reuse', () => {
  it('reuses the E47 enemy paper-plane mesh unchanged, recoloured white/pink for Rosari', async () => {
    const THREE = await import('three')
    const { SHOT_VISUALS, createPaperPlaneGeometry } = await import('./projectileZombieShotGeometry.js')
    const { PAPER_PLANE_BODY_COLOR, PAPER_PLANE_KEEL_COLOR } = await import('../components/Weapons/PaperPlane.jsx')
    const enemy = SHOT_VISUALS.find((v) => v.key === 'paperPlane').create()
    const weapon = createPaperPlaneGeometry(PAPER_PLANE_BODY_COLOR, PAPER_PLANE_KEEL_COLOR)
    // 같은 모양: 정점 위치·인덱스가 완전히 같다.
    expect(Array.from(weapon.attributes.position.array)).toEqual(Array.from(enemy.attributes.position.array))
    expect(Array.from(weapon.index.array)).toEqual(Array.from(enemy.index.array))
    // 색만 다르다: 흰 몸체 → 로자리 흰색, 하늘색 용골 → 분홍.
    const body = new THREE.Color().setHex(PAPER_PLANE_BODY_COLOR)
    const keel = new THREE.Color().setHex(PAPER_PLANE_KEEL_COLOR)
    const ec = enemy.attributes.color
    const wc = weapon.attributes.color
    let bodyCount = 0
    let keelCount = 0
    for (let i = 0; i < ec.count; i += 1) {
      const wasWhite = ec.getX(i) === 1 && ec.getY(i) === 1 && ec.getZ(i) === 1
      const want = wasWhite ? body : keel
      if (wasWhite) bodyCount += 1; else keelCount += 1
      expect(wc.getX(i)).toBeCloseTo(want.r, 6)
      expect(wc.getY(i)).toBeCloseTo(want.g, 6)
      expect(wc.getZ(i)).toBeCloseTo(want.b, 6)
    }
    expect(bodyCount).toBeGreaterThan(0)
    expect(keelCount).toBeGreaterThan(0)
  })
})
