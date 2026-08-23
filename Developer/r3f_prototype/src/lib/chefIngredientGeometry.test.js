import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createChefIngredientGeometries } from './chefIngredientGeometry.js'
import { CHEF_INGREDIENT_KINDS, E04_PROJECTILE_RADIUS } from './enemyProjectilePool.js'

describe('createChefIngredientGeometries', () => {
  it('당근·양파·감자·식칼 4종을 병합 지오메트리 하나씩으로 만든다', () => {
    const geometries = createChefIngredientGeometries()
    expect(geometries).toHaveLength(4)
    expect(geometries).toHaveLength(CHEF_INGREDIENT_KINDS.length)
    for (const geometry of geometries) {
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry)
      expect(geometry.attributes.position.count).toBeGreaterThan(0)
      // vertex color로 파트별 색을 구워야 재료당 머티리얼 하나로 끝난다.
      expect(geometry.attributes.color.count).toBe(geometry.attributes.position.count)
      expect(geometry.attributes.normal.count).toBe(geometry.attributes.position.count)
      const positions = geometry.attributes.position.array
      for (let i = 0; i < positions.length; i += 1) expect(Number.isFinite(positions[i])).toBe(true)
    }
    // 4종이 전부 같은 모양이면 재료 구분이 안 된다.
    const signatures = new Set(geometries.map((geometry) => geometry.attributes.position.count))
    expect(signatures.size).toBeGreaterThan(1)
    geometries.forEach((geometry) => geometry.dispose())
  })

  it('기존 E04 구체(반경 0.09)와 시각 부피가 비슷한 범위에 머문다', () => {
    const sphere = new THREE.SphereGeometry(E04_PROJECTILE_RADIUS, 8, 8)
    sphere.computeBoundingSphere()
    const reference = sphere.boundingSphere.radius
    for (const geometry of createChefIngredientGeometries()) {
      geometry.computeBoundingSphere()
      const radius = geometry.boundingSphere.radius
      // 화면을 가릴 만큼 커지지 않게 잠근다. 식칼이 가장 길어도 구체의 2.2배 이내다.
      expect(radius).toBeGreaterThan(reference * 0.8)
      expect(radius).toBeLessThan(reference * 2.2)
      geometry.dispose()
    }
    sphere.dispose()
  })
})
