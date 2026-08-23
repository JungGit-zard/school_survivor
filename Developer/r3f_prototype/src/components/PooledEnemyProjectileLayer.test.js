import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./PooledEnemyProjectileLayer.jsx', import.meta.url), 'utf8')

describe('PooledEnemyProjectileLayer GPU compaction', () => {
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
