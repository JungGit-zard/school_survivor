import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { composeStudioPartTransformCache, getStudioTransformProps } from './StudioTunedGroup.jsx'
import { CHARGE_CUE_CAPACITY, ENEMY_RENDER_CULLED, ENEMY_RENDER_FAR, ENEMY_RENDER_MID, ENEMY_RENDER_NEAR, ENEMY_VISUAL_WORLD_SCALE, applyCachedPartTransform, applyPooledZombieStudioPartTunings, copyRootTransform, e01PartSlotsForNumericPath, fillChargeCueSlots, fillEnemyHealthBarLayout, fillVisibleChargeCueSlots, getPooledEnemyAnimationTime, getPooledChargeCueY, getPooledEnemyRenderTier, getPooledEnemyVisibility, getSpawnSmokeOpacity, hasUnsupportedStudioPartTuning, pooledZombiePartSlotsForNumericPath, selectChargeCueSlots, setSlotOpacity, shouldRefreshEnemySight, shouldRenderPooledEnemyPart, updateHealthVisualState } from './PooledEnemyVisuals.js'

describe('pooled enemy visual pure contracts', () => {
  it('holds smoke before and through reveal, then hides it at its final lifetime', () => {
    expect(getPooledEnemyVisibility(1, 0)).toEqual({ smoke: true, body: false, health: false, cue: false })
    expect(getPooledEnemyVisibility(1, 299.999).body).toBe(false)
    expect(getPooledEnemyVisibility(1, 300)).toMatchObject({ smoke: true, body: true, health: true, cue: true })
    expect(getPooledEnemyVisibility(1, 849.999).smoke).toBe(true)
    expect(getPooledEnemyVisibility(1, 850).smoke).toBe(false)
    expect(getSpawnSmokeOpacity(300)).toBe(1)
  })

  it('fills a reusable cue scratch at 200-enemy worst case without retaining selections', () => {
    const pool = { highestActive: 199, active: new Uint8Array(200).fill(1), type: new Uint8Array(200).fill(5), state: new Uint8Array(200).fill(2), spawnTimer: new Float32Array(200).fill(300) }
    const out = new Int16Array(CHARGE_CUE_CAPACITY)
    expect(fillChargeCueSlots(pool, out)).toBe(200 - CHARGE_CUE_CAPACITY)
    expect(out[0]).toBe(0); expect(out.at(-1)).toBe(CHARGE_CUE_CAPACITY - 1)
  })

  it('selects visible warning cues after offscreen low-index warnings instead of filtering them too late', () => {
    const pool = { highestActive: 31, active: new Uint8Array(200), type: new Uint8Array(200), state: new Uint8Array(200), spawnTimer: new Float32Array(200) }
    const tiers = new Uint8Array(200)
    for (let index = 0; index < 32; index += 1) { pool.active[index] = 1; pool.type[index] = 5; pool.state[index] = 2; pool.spawnTimer[index] = 300 }
    for (let index = 16; index < 32; index += 1) tiers[index] = ENEMY_RENDER_FAR
    const out = new Int16Array(CHARGE_CUE_CAPACITY)
    expect(fillVisibleChargeCueSlots(pool, tiers, out)).toBe(0)
    expect(out[0]).toBe(16)
    expect(out.at(-1)).toBe(31)
  })

  it('keeps alpha values independent for two instanced slots', () => {
    const alpha = new Float32Array(200)
    setSlotOpacity(alpha, 3, .2); setSlotOpacity(alpha, 199, .8)
    expect(alpha[3]).toBeCloseTo(.2); expect(alpha[199]).toBeCloseTo(.8)
  })

  it('selects fixed-cap E05 warning cues and reports overflow', () => {
    const pool = { highestActive: 199, active: new Uint8Array(200), type: new Uint8Array(200), state: new Uint8Array(200), spawnTimer: new Float32Array(200) }
    for (let i = 0; i < 20; i += 1) { pool.active[i] = 1; pool.type[i] = 5; pool.state[i] = 2; pool.spawnTimer[i] = 300 }
    const result = selectChargeCueSlots(pool)
    expect(result.selected).toHaveLength(CHARGE_CUE_CAPACITY)
    expect(result.selected[0]).toBe(0)
    expect(result.selected.at(-1)).toBe(15)
    expect(result.overflow).toBe(4)
  })

  it('resets health trail state when a slot is reused by a new generation', () => {
    const state = { generation: new Uint16Array(200), lastRatio: new Float32Array(200), trailRatio: new Float32Array(200), flash: new Float32Array(200), ratio: new Float32Array(200), visibleTrailRatio: new Float32Array(200) }
    state.generation[199] = 1
    updateHealthVisualState(state, 199, 1, 0.4, 0.016)
    updateHealthVisualState(state, 199, 1, 0.2, 0.016)
    expect(state.visibleTrailRatio[199]).toBeGreaterThan(0.2)
    updateHealthVisualState(state, 199, 2, 1, 0.016)
    expect(state.ratio[199]).toBe(1); expect(state.visibleTrailRatio[199]).toBe(1); expect(state.flash[199]).toBe(0)
  })

  it('keeps E01 health bars at the MiniHealthBar world-space width, height, and y contract', () => {
    const layout = fillEnemyHealthBarLayout(new Float32Array(3), 4 / 3)
    expect(layout[0]).toBeCloseTo(0.32 * (4 / 3))
    expect(layout[1]).toBeCloseTo(0.045)
    expect(layout[2]).toBeCloseTo(0.72 * (4 / 3))
  })

  it('keeps the pooled E05 GO cue tail above its head at the largest pulse', () => {
    const e05VisualScale = 1.15 * (4 / 3)
    const cueRootY = getPooledChargeCueY(0, e05VisualScale)
    const headTopY = (0.82 + 0.48 / 2) * e05VisualScale * ENEMY_VISUAL_WORLD_SCALE
    const tailBottomY = cueRootY + (-0.18 - 0.12 / 2) * 1.08

    expect(tailBottomY - headTopY).toBeGreaterThan(0.08)
  })

  it('does not silently accept numeric-path Studio part tunings', () => {
    expect(hasUnsupportedStudioPartTuning({ 'zombie-e01::part::0.0': {} }, 'zombie-e01')).toBe(true)
    expect(hasUnsupportedStudioPartTuning({ 'zombie-e01': {} }, 'zombie-e01')).toBe(false)
  })

  it('copies the same Firebase root transform order as StudioTunedGroup', () => {
    const transform = getStudioTransformProps({ scale: 1.2, scaleX: .8, scaleY: 1.1, scaleZ: .9, positionX: 2, positionY: 3, positionZ: 4, rotationX: .2, rotationY: -.3, rotationZ: .4 })
    const packed = copyRootTransform(new Float32Array(9), transform)
    const expected = new THREE.Matrix4().compose(new THREE.Vector3(...transform.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...transform.rotation)), new THREE.Vector3(...transform.scale))
    const actual = new THREE.Matrix4().compose(new THREE.Vector3(packed[0], packed[1], packed[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(packed[3], packed[4], packed[5])), new THREE.Vector3(packed[6], packed[7], packed[8]))
    for (let index = 0; index < 16; index += 1) expect(actual.elements[index]).toBeCloseTo(expected.elements[index], 6)
    expect(packed[6]).toBeCloseTo(.96); expect(packed[8]).toBeCloseTo(1.08)
  })

  it('keeps fixed slot 199 zeroable on inactive reuse', () => {
    expect(getPooledEnemyVisibility(1, 300).body).toBe(true)
    expect(getPooledEnemyVisibility(0, 300).body).toBe(false)
  })

  it('uses a conservative screen margin and distance tiers without native InstancedMesh culling', () => {
    const bounds = { minX: -12, maxX: 12, minZ: -12, maxZ: 12 }
    expect(getPooledEnemyRenderTier(bounds, 0, 0, 0, 0)).toBe(ENEMY_RENDER_NEAR)
    expect(getPooledEnemyRenderTier(bounds, 7, 0, 0, 0)).toBe(ENEMY_RENDER_MID)
    expect(getPooledEnemyRenderTier(bounds, 11.5, 0, 0, 0)).toBe(ENEMY_RENDER_FAR)
    expect(getPooledEnemyRenderTier(bounds, 14, 0, 0, 0)).toBe(ENEMY_RENDER_CULLED)
    expect(getPooledEnemyRenderTier(bounds, 13.5, 0, 0, 0, ENEMY_RENDER_FAR)).toBe(ENEMY_RENDER_FAR)
  })

  it('keeps a toon-plus-outline core at far LOD while reducing micro parts and animation cadence', () => {
    let near = 0; let far = 0
    for (let index = 0; index < 12; index += 1) {
      if (shouldRenderPooledEnemyPart(1, index, ENEMY_RENDER_NEAR)) near += 1
      if (shouldRenderPooledEnemyPart(1, index, ENEMY_RENDER_FAR)) far += 1
    }
    expect(far).toBeGreaterThan(0)
    expect(far).toBeLessThan(near)
    expect(shouldRenderPooledEnemyPart(1, 0, ENEMY_RENDER_FAR)).toBe(true)
    expect(shouldRenderPooledEnemyPart(1, 3, ENEMY_RENDER_FAR)).toBe(true)
    expect(getPooledEnemyAnimationTime(149, ENEMY_RENDER_MID)).toBeCloseTo(.1)
    expect(getPooledEnemyAnimationTime(199, ENEMY_RENDER_FAR)).toBeCloseTo(.1)
    expect(getPooledEnemyAnimationTime(199, ENEMY_RENDER_NEAR)).toBeCloseTo(.199)
    for (const core of [12, 18, 22, 24, 26, 27, 29, 30]) expect(shouldRenderPooledEnemyPart(7, core, ENEMY_RENDER_FAR)).toBe(true)
    let runNear = 0; let runFar = 0
    for (let index = 12; index <= 32; index += 1) {
      if (shouldRenderPooledEnemyPart(7, index, ENEMY_RENDER_NEAR)) runNear += 1
      if (shouldRenderPooledEnemyPart(7, index, ENEMY_RENDER_FAR)) runFar += 1
    }
    expect(runFar).toBeGreaterThan(0)
    expect(runFar).toBeLessThan(runNear)
  })

  it('staggers sight checks and immediately refreshes a reused generation', () => {
    let checks = 0
    for (let frame = 0; frame < 12; frame += 1) for (let slot = 0; slot < 200; slot += 1) if (shouldRefreshEnemySight(ENEMY_RENDER_CULLED, slot, frame, 1, 1)) checks += 1
    expect(checks).toBe(200)
    expect(shouldRefreshEnemySight(ENEMY_RENDER_FAR, 199, 0, 1, 2)).toBe(true)
    expect(shouldRefreshEnemySight(ENEMY_RENDER_NEAR, 0, 0, 1, 1)).toBe(true)
    expect(shouldRefreshEnemySight(ENEMY_RENDER_NEAR, 0, 1, 1, 1)).toBe(false)
  })

  it('maps E01 numeric head/eye/arm/leg paths and composes group then part offsets', () => {
    const slots = new Int16Array(12); const cache = new Float32Array(12 * 9)
    for (let index=0;index<12;index+=1) { const o=index*9; cache[o+6]=1;cache[o+7]=1;cache[o+8]=1 }
    let count=e01PartSlotsForNumericPath('0.0',slots); expect(count).toBe(3)
    applyCachedPartTransform(cache,0,slots,count,{position:[1,0,0],rotation:[0,0,0],scale:[2,2,2]},composeStudioPartTransformCache)
    count=e01PartSlotsForNumericPath('0.0.1',slots); expect(slots[0]).toBe(1)
    applyCachedPartTransform(cache,0,slots,count,{position:[0,2,0],rotation:[0,.5,0],scale:[.5,1,1]},composeStudioPartTransformCache)
    expect(cache[0]).toBe(1); expect(cache[9]).toBe(1); expect(cache[10]).toBe(2); expect(cache[15]).toBeCloseTo(1); expect(cache[6]).toBe(2)
    expect(e01PartSlotsForNumericPath('0.2',slots)).toBe(2); expect(e01PartSlotsForNumericPath('0.4',slots)).toBe(2)
  })

  it('resolves the exact E01 arm/hand and leg/foot numeric paths including mesh suffixes', () => {
    const slots = new Int16Array(12)
    const cases = [['0.2.0',4],['0.2.1',5],['0.2.1.0',5],['0.2.1.1',5],['0.3.0',6],['0.3.1',7],['0.4.0',8],['0.4.1',9],['0.5.0',10],['0.5.1',11],['9.0.2.1',5]]
    for (const [path, expected] of cases) { expect(e01PartSlotsForNumericPath(path,slots)).toBe(1); expect(slots[0]).toBe(expected) }
    expect(e01PartSlotsForNumericPath('0.6.0',slots)).toBe(0)
    expect(e01PartSlotsForNumericPath('bad.path',slots)).toBe(0)
  })

  it('applies every pooled zombie item part tuning through the canonical Studio cache', () => {
    const partCount = 33
    const cache = new Float32Array(9 * partCount * 9)
    for (let type = 1; type <= 8; type += 1) {
      const base = type * partCount * 9
      for (let part = 0; part < partCount; part += 1) {
        cache[base + part * 9 + 6] = 1
        cache[base + part * 9 + 7] = 1
        cache[base + part * 9 + 8] = 1
      }
    }
    const itemIds = ['', 'zombie-e01', 'zombie-e02', 'zombie-e03', 'zombie-e04', 'zombie-e05', 'zombie-e06', 'zombie-rzl', 'zombie-rzc']
    const tunings = Object.fromEntries(itemIds.slice(1).map((itemId, index) => [`${itemId}::part::0.0.0`, {
      positionX: (index + 1) * 0.1,
      rotationY: 15,
      scale: 1.2,
    }]))
    const slots = new Int16Array(12)

    for (let type = 1; type <= 8; type += 1) {
      applyPooledZombieStudioPartTunings(cache, type, partCount, itemIds[type], tunings, getStudioTransformProps, composeStudioPartTransformCache, slots)
      const slotCount = pooledZombiePartSlotsForNumericPath(type, '0.0.0', slots)
      expect(slotCount).toBe(1)
      const offset = type * partCount * 9 + slots[0] * 9
      expect(cache[offset]).toBeCloseTo(type * 0.1)
      expect(cache[offset + 4]).toBeCloseTo(THREE.MathUtils.degToRad(15))
      expect(cache[offset + 6]).toBeCloseTo(1.2)
    }
  })

  it('forbids pooled renderers from redefining the canonical Studio transform arithmetic', () => {
    const pooledSource = readFileSync(new URL('./PooledEnemyVisuals.js', import.meta.url), 'utf8')
    const layerSource = readFileSync(new URL('./ZombieInstanceLayer.jsx', import.meta.url), 'utf8')

    expect(pooledSource).toContain('composeStudioTransformCache(cache, offset, transform)')
    expect(pooledSource).not.toMatch(/cache\[offset(?:\s*\+\s*\d+)?\]\s*(?:\+=|\*=)\s*transform\./)
    expect(layerSource).toContain('composeStudioPartOffset(part[3][0]')
    expect(layerSource).toContain('composeStudioPartMultiplier(1,studio.current.partTransforms')
    expect(layerSource).not.toContain('part[3][0]+studio.current.partTransforms')
    expect(layerSource).not.toContain('e.x+=studio.current.partTransforms')
  })
})
