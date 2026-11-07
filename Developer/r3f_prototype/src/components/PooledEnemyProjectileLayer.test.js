import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { markInstancedMeshPrefixUpdate } from './ZombieInstanceLayer.jsx'

const source = readFileSync(new URL('./PooledEnemyProjectileLayer.jsx', import.meta.url), 'utf8')

describe('PooledEnemyProjectileLayer GPU compaction', () => {
  it('uploads only active matrix prefixes, skips zero-count scene traversal, and restores cleared buffers on reset', () => {
    expect(source).toContain('result.visible = false')
    expect(source).toContain('markInstancedMeshFullUpdate(bodies[kind], { matrix: true })')
    expect(source).toContain('markInstancedMeshFullUpdate(outlines[kind], { matrix: true })')
    expect(source).toContain('markInstancedMeshPrefixUpdate(bodies[kind], counts[kind], { matrix: true })')
    expect(source).toContain('markInstancedMeshPrefixUpdate(outlines[kind], counts[kind], { matrix: true })')
    expect(source).not.toContain('bodies[kind].instanceMatrix.needsUpdate = true')
    expect(source).not.toContain('outlines[kind].instanceMatrix.needsUpdate = true')
  })

  it('retains native-cluster safety while drawing only contiguous visible projectile slots', () => {
    expect(source).toContain('result.frustumCulled = false')
    // kind별로 count를 따로 세되, 각 kind 안에서는 여전히 앞에서부터 촘촘히 채운다.
    expect(source).toContain('counts.fill(0)')
    expect(source).toContain('const slot = counts[kind]')
    expect(source).toContain('bodies[kind].setMatrixAt(slot, matrix)')
    expect(source).toContain('outlines[kind].setMatrixAt(slot, matrix)')
    expect(source).toContain('counts[kind] = slot + 1')
    expect(source).toContain('bodies[kind].count = counts[kind]')
    expect(source).toContain('outlines[kind].count = counts[kind]')
    expect(source).toContain('bodies[kind].count = 0')
    expect(source).toContain('outlines[kind].count = 0')
  })

  it('keeps the E04 sphere untouched and gives ingredient kinds one InstancedMesh pair each', () => {
    // E04 정본: 청록 구체, 반경 0.09. 이 두 값이 바뀌면 스2~4 잡몹 비주얼 회귀다.
    expect(source).toContain('new THREE.SphereGeometry(.09, 8, 8)')
    expect(source).toContain('color: 0x34d6b8, emissive: 0x34d6b8, emissiveIntensity: .45')
    expect(source).toContain("if (kind === 0) quaternion.identity()")
    // 재료는 kind당 body/outline 한 쌍씩. 재료마다 개별 Mesh를 만들지 않는다.
    expect(source).toContain('createChefIngredientGeometries()')
    expect(source).toContain('vertexColors: true')
    expect(source).toContain('side: THREE.BackSide')
  })

  it('scales only B04 chef ingredient projectile visuals to exact 3x while preserving the 1.22 outline ratio', () => {
    expect(source).toContain('const CHEF_INGREDIENT_VISUAL_SCALE = 3')
    expect(source).toContain('const OUTLINE_SCALE_MULTIPLIER = 1.22')
    expect(source).toContain('scale.setScalar(kind === 0 ? 1 : CHEF_INGREDIENT_VISUAL_SCALE)')
    expect(source).toContain('scale.setScalar((kind === 0 ? 1 : CHEF_INGREDIENT_VISUAL_SCALE) * OUTLINE_SCALE_MULTIPLIER)')
    expect(source).toContain('new THREE.SphereGeometry(.09, 8, 8)')
  })

  it('marks only active projectile kind prefixes and leaves zero-count kinds unuploaded', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshBasicMaterial()
    const inactive = new THREE.InstancedMesh(geometry, material, 4)
    const active = new THREE.InstancedMesh(geometry, material, 4)

    markInstancedMeshPrefixUpdate(inactive, 0, { matrix: true })
    markInstancedMeshPrefixUpdate(active, 3, { matrix: true })

    expect(inactive.visible).toBe(false)
    expect(active.visible).toBe(true)
    expect(inactive.instanceMatrix.updateRanges).toEqual([])
    expect(active.instanceMatrix.updateRanges).toEqual([{ start: 0, count: 48 }])
    geometry.dispose(); material.dispose()
  })
})

describe('applyChefIngredientSpin', () => {
  it('is deterministic per instance and driven by ageMs only', async () => {
    const { applyChefIngredientSpin } = await import('../lib/chefIngredientSpin.js')
    const THREE = await import('three')
    const a = applyChefIngredientSpin(new THREE.Quaternion(), 3, 500).clone()
    const b = applyChefIngredientSpin(new THREE.Quaternion(), 3, 500).clone()
    expect(a.equals(b)).toBe(true)
    const later = applyChefIngredientSpin(new THREE.Quaternion(), 3, 900).clone()
    expect(later.equals(a)).toBe(false)
    const other = applyChefIngredientSpin(new THREE.Quaternion(), 4, 500).clone()
    expect(other.equals(a)).toBe(false)
    // ageMs가 비정상이어도 NaN 쿼터니언을 만들지 않는다.
    const guarded = applyChefIngredientSpin(new THREE.Quaternion(), 7, Number.NaN)
    expect(Number.isFinite(guarded.x + guarded.y + guarded.z + guarded.w)).toBe(true)
  })
})

describe('PooledEnemyProjectileLayer projectile zombie shots', () => {
  it('draws each shot kind with its own instanced look, groups decals, and props up hidden ambushers', async () => {
    const { createProjectileZombieShotMeshes, writeProjectileZombieShotFrame, DECAL_OPACITY } = await import('./PooledEnemyProjectileLayer.jsx')
    const { SHOT_KIND, SHOT_MOTION, createProjectileZombieShotPool, createShotSpec } = await import('../lib/projectileZombieShotPool.js')
    const { DECAL_VISUAL, SHOT_VISUALS, getShotVisualIndex } = await import('../lib/projectileZombieShotGeometry.js')
    const shots = createProjectileZombieShotMeshes({
      bodyMat: new THREE.MeshBasicMaterial({ vertexColors: true }),
      outMat: new THREE.MeshBasicMaterial({ side: THREE.BackSide }),
      decalMats: DECAL_OPACITY.map((opacity) => new THREE.MeshBasicMaterial({ transparent: true, opacity })),
    })
    expect(shots.shotBodies).toHaveLength(SHOT_VISUALS.length)
    expect(shots.decals).toHaveLength(4)
    expect(shots.propBodies).toHaveLength(2)

    const pool = createProjectileZombieShotPool()
    const spec = (kind, motion, extra = {}) => ({ ...createShotSpec(), kind, motion, speed: 2, ...extra })
    pool.spawn(0, 0, 1, 0, spec(SHOT_KIND.ERASER, SHOT_MOTION.BOUNCE))
    pool.spawn(1, 0, 1, 0, spec(SHOT_KIND.ERASER, SHOT_MOTION.BOUNCE))
    pool.spawn(0, 1, 0, 1, spec(SHOT_KIND.PAPER_PLANE, SHOT_MOTION.HOMING))
    pool.spawn(0, 2, 0, 1, spec(SHOT_KIND.FLASK, SHOT_MOTION.SPLIT))
    pool.spawn(0, 3, 0, 1, spec(SHOT_KIND.FLASK, SHOT_MOTION.STRAIGHT)) // 갈라진 파편
    const fuse = pool.spawn(0, 4, 0, 1, spec(SHOT_KIND.MILK_CARTON, SHOT_MOTION.FUSE))
    pool.velX[fuse] = 0; pool.velZ[fuse] = 0; pool.ageMs[fuse] = 40 // 멈춰서 깜빡이는 중
    pool.spawnDecal(2, 2, SHOT_KIND.DECAL_MARKER, 0.9, 500)
    pool.spawnDecal(3, 3, SHOT_KIND.DECAL_AIM_LINE, 0.09, 500, 3, 0.4)
    pool.spawnDecal(4, 4, SHOT_KIND.ZONE_WATER, 0.9, 4000, 0, 0, 0.65)

    const enemies = {
      highestActive: 3,
      active: new Uint8Array([1, 1, 1, 1]),
      type: new Uint8Array([61, 63, 63, 49]), // E58 숨음, E60 숨음, E60 서 있음(회복), E46
      state: new Uint8Array([14, 14, 17, 14]),
      spawnTimer: new Float32Array([1000, 1000, 1000, 1000]),
      posX: new Float32Array([0, 1, 2, 3]),
      posZ: new Float32Array(4),
      lastContactY: new Float32Array(4),
      visualScale: new Float32Array([0.9, 1, 1, 1]),
    }
    writeProjectileZombieShotFrame(shots, pool, enemies, { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, { x: 0, z: 0 })

    const count = (kind, motion) => shots.shotBodies[getShotVisualIndex(kind, motion)].count
    expect(count(SHOT_KIND.ERASER, SHOT_MOTION.BOUNCE)).toBe(2)
    expect(count(SHOT_KIND.PAPER_PLANE, SHOT_MOTION.HOMING)).toBe(1)
    expect(count(SHOT_KIND.FLASK, SHOT_MOTION.SPLIT)).toBe(1)
    expect(count(SHOT_KIND.FLASK, SHOT_MOTION.STRAIGHT)).toBe(1)
    expect(count(SHOT_KIND.MILK_CARTON, SHOT_MOTION.FUSE)).toBe(1)
    const totalBodies = shots.shotBodies.reduce((sum, m) => sum + m.count, 0)
    expect(totalBodies).toBe(6)
    shots.shotBodies.forEach((m, v) => expect(shots.shotOutlines[v].count).toBe(m.count))
    // count 0인 외형은 그리지 않는다(드로콜 없음).
    const drawn = shots.all.filter((m) => m.visible).length
    expect(drawn).toBe(5 * 2 + 4 + 2 * 2)

    expect(shots.decals[DECAL_VISUAL.RING].count).toBe(1)
    expect(shots.decals[DECAL_VISUAL.MARKER_FILL].count).toBe(1)
    expect(shots.decals[DECAL_VISUAL.LINE].count).toBe(1)
    expect(shots.decals[DECAL_VISUAL.PUDDLE_FILL].count).toBe(1)

    expect(shots.propBodies[0].count).toBe(1) // 줄넘기 똬리
    expect(shots.propBodies[1].count).toBe(1) // 배수구(서 있는 E60은 제외)

    // 퓨즈 우유갑은 instanceColor로 깜빡인다.
    const milk = shots.shotBodies[getShotVisualIndex(SHOT_KIND.MILK_CARTON, SHOT_MOTION.FUSE)]
    const c = new THREE.Color(); milk.getColorAt(0, c)
    expect(c.getHex()).not.toBe(0xffffff)

    pool.reset()
    enemies.active.fill(0)
    writeProjectileZombieShotFrame(shots, pool, enemies, { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, { x: 0, z: 0 })
    expect(shots.all.every((m) => m.count === 0 && !m.visible)).toBe(true)
    shots.geometries.forEach((g) => g.dispose())
  })

  it('keeps the E04 and chef render path separate from the projectile zombie shots', () => {
    expect(source).toContain('writeProjectileZombieShotFrame(shots, projectileZombieShotPool, enemyPool, screenBounds, playerPos)')
    expect(source).toContain('getShotVisualIndex(kind, motion)')
    expect(source).not.toContain('shots.bodyMesh')
  })

  it('composes the E04 projectile with its Studio root transform and keeps hulls in the transparent pass', async () => {
    const { composeE04ProjectileStudioRoot, E04_PROJECTILE_STUDIO_ITEM_ID } = await import('./PooledEnemyProjectileLayer.jsx')
    expect(E04_PROJECTILE_STUDIO_ITEM_ID).toBe('enemy-projectile-e04')
    const root = composeE04ProjectileStudioRoot(new THREE.Matrix4(), { positionY: 0.2, scale: 1.5 })
    const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3()
    root.decompose(p, q, s)
    expect(p.y).toBeCloseTo(0.2)
    expect(s.x).toBeCloseTo(1.5)
    expect(composeE04ProjectileStudioRoot(new THREE.Matrix4(), undefined).equals(new THREE.Matrix4())).toBe(true)
    expect(source).toContain('loadStudioTunings()[E04_PROJECTILE_STUDIO_ITEM_ID]')
    expect(source).toContain('window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, refresh)')
    expect(source.match(/side: THREE\.BackSide, transparent: true, opacity: 1, depthWrite: false/g)).toHaveLength(2)
    const preview = readFileSync(new URL('./EnemyProjectileVisual.jsx', import.meta.url), 'utf8')
    expect(preview).toContain('scale={[1.22, 1.22, 1.22]}')
    expect(preview).toContain('outlineMat(1)')
  })
})
