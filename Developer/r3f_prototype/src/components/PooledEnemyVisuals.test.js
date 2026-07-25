import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { getStudioTransformProps } from './StudioTunedGroup.jsx'
import { CHARGE_CUE_CAPACITY, applyCachedPartTransform, copyRootTransform, e01PartSlotsForNumericPath, fillChargeCueSlots, fillEnemyHealthBarLayout, getPooledEnemyVisibility, getSpawnSmokeOpacity, hasUnsupportedStudioPartTuning, selectChargeCueSlots, setSlotOpacity, updateHealthVisualState } from './PooledEnemyVisuals.js'

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

  it('maps E01 numeric head/eye/arm/leg paths and composes group then part offsets', () => {
    const slots = new Int16Array(12); const cache = new Float32Array(12 * 9)
    for (let index=0;index<12;index+=1) { const o=index*9; cache[o+6]=1;cache[o+7]=1;cache[o+8]=1 }
    let count=e01PartSlotsForNumericPath('0.0',slots); expect(count).toBe(3)
    applyCachedPartTransform(cache,0,slots,count,{position:[1,0,0],rotation:[0,0,0],scale:[2,2,2]})
    count=e01PartSlotsForNumericPath('0.0.1',slots); expect(slots[0]).toBe(1)
    applyCachedPartTransform(cache,0,slots,count,{position:[0,2,0],rotation:[0,.5,0],scale:[.5,1,1]})
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
})
