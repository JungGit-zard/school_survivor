import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import {
  ONIGIRI_BURST_GRAINS, createOnigiriBodyLayer, createOnigiriGrainLayer, createOnigiriGrainMaterial,
  grainPoseInto, relativeMatrixInto,
} from './onigiriInstanceLayer.js'
import { createOnigiriBurstGrains } from './onigiri.js'

// 2026-11-13 오니기리 렌더 비용 완화의 "모양이 그대로인가" 검증.
// 예전: 발사체 group(position + rotation) 아래 OnigiiriModel 메시 12개를 직접 그렸다.
// 지금: 템플릿 1벌의 메시마다 InstancedMesh 1개, 인스턴스 행렬 = 발사체 자세 × (템플릿 루트 기준 메시 행렬).
// 아래 픽스처는 OnigiiriModel처럼 중첩 group·축척·회전과 Studio가 바꿀 수 있는 파츠 변형을 가진 템플릿이다.

function makeTemplate() {
  const root = new THREE.Group()
  const scaled = new THREE.Group()
  scaled.scale.set(0.42, 0.42, 0.42)
  scaled.position.set(0.01, 0.02, -0.03) // Studio 루트 변형 흉내
  root.add(scaled)
  const meshes = []
  const geo = new THREE.BoxGeometry(1, 1, 1)
  for (let i = 0; i < 12; i += 1) {
    const mat = new THREE.MeshBasicMaterial()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(i * 0.05, -0.2 + i * 0.03, 0.3)
    mesh.rotation.set(0, 0, (i - 6) * 0.07)
    mesh.scale.set(1 + i * 0.01, 1, 1.1)
    mesh.renderOrder = 1 + (i % 5)
    scaled.add(mesh)
    meshes.push(mesh)
  }
  return { root, scaled, meshes }
}

// 예전 방식 그대로: 발사체 group에 템플릿과 같은 트리를 붙였을 때 메시의 월드 행렬.
function oldWorldMatrices(position, rotation) {
  const { root, meshes } = makeTemplate()
  const projectile = new THREE.Group()
  projectile.position.copy(position)
  projectile.rotation.copy(rotation)
  projectile.add(root)
  projectile.updateMatrixWorld(true)
  return meshes.map((mesh) => mesh.matrixWorld.clone())
}

function instanceMatrix(part, slot) {
  const out = new THREE.Matrix4()
  part.mesh.getMatrixAt(slot, out)
  return out
}

function expectMatrixClose(actual, expected) {
  for (let i = 0; i < 16; i += 1) expect(actual.elements[i]).toBeCloseTo(expected.elements[i], 6)
}

describe('onigiri body instance layer (one draw call per template mesh)', () => {
  it('draws every projectile with exactly the old per-projectile mesh transforms', () => {
    const layer = createOnigiriBodyLayer(4)
    const { root } = makeTemplate()
    expect(layer.syncTemplate(root)).toBe(12)
    expect(layer.group.children).toHaveLength(12) // 주먹밥이 몇 개든 그리기 호출은 12회

    const poses = [
      [new THREE.Vector3(1, 0.57, -2), new THREE.Euler(0.3, 2.1, -0.2)],
      [new THREE.Vector3(-4, 0.6, 3.5), new THREE.Euler(-0.35, 7.9, 0.25)],
      [new THREE.Vector3(0, 0.79, 0), new THREE.Euler(0, 0, 0)],
    ]
    const slots = poses.map(([p, r]) => {
      const slot = layer.claim()
      layer.write(slot, p, r)
      return slot
    })
    expect(layer.count).toBe(3)
    poses.forEach(([p, r], i) => {
      const expected = oldWorldMatrices(p, r)
      layer.parts.forEach((part, k) => expectMatrixClose(instanceMatrix(part, slots[i]), expected[k]))
    })
    layer.parts.forEach((part, k) => {
      expect(part.mesh.count).toBe(3)
      expect(part.mesh.renderOrder).toBe(1 + (k % 5))
      expect(part.mesh.frustumCulled).toBe(false)
    })
  })

  it('uses the template geometry and material objects themselves (no copies), and follows a Studio material swap', () => {
    const layer = createOnigiriBodyLayer(2)
    const { root, meshes } = makeTemplate()
    layer.syncTemplate(root)
    layer.parts.forEach((part, k) => {
      expect(part.mesh.geometry).toBe(meshes[k].geometry)
      expect(part.mesh.material).toBe(meshes[k].material)
    })
    const isolated = meshes[3].material.clone() // Studio가 재질을 분리하면 템플릿 메시 재질이 바뀐다
    meshes[3].material = isolated
    layer.syncTemplate(root)
    expect(layer.parts[3].mesh.material).toBe(isolated)
  })

  it('re-applies a Studio part transform change to projectiles already in the air', () => {
    const layer = createOnigiriBodyLayer(2)
    const { root, meshes } = makeTemplate()
    layer.syncTemplate(root)
    const slot = layer.claim()
    const p = new THREE.Vector3(2, 0.6, 1)
    const r = new THREE.Euler(0.1, 1, 0.2)
    layer.write(slot, p, r)

    meshes[5].position.y += 0.4 // 파츠 위치 튜닝
    meshes[5].scale.multiplyScalar(1.12) // 외곽선 두께 배율 같은 축척 변화
    layer.syncTemplate(root)

    const projectile = new THREE.Group()
    projectile.position.copy(p)
    projectile.rotation.copy(r)
    projectile.add(root)
    projectile.updateMatrixWorld(true)
    expectMatrixClose(instanceMatrix(layer.parts[5], slot), meshes[5].matrixWorld)
  })

  it('picks up a mesh added to the template (e.g. a Studio texture decal) and hides parts hidden in the template', () => {
    const layer = createOnigiriBodyLayer(2)
    const { root, scaled, meshes } = makeTemplate()
    layer.syncTemplate(root)
    const slot = layer.claim()
    layer.write(slot, new THREE.Vector3(1, 0, 1), new THREE.Euler())
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ transparent: true }))
    scaled.add(decal)
    expect(layer.syncTemplate(root)).toBe(13)
    expect(layer.parts[12].mesh.material).toBe(decal.material)
    expect(layer.parts[12].mesh.count).toBe(1)
    expect(instanceMatrix(layer.parts[12], slot).determinant()).not.toBe(0)

    meshes[0].visible = false
    layer.syncTemplate(root)
    expect(layer.parts[0].mesh.visible).toBe(false)
    root.visible = false // 템플릿 자체는 숨겨 두지만 인스턴스는 보여야 한다
    layer.syncTemplate(root)
    expect(layer.parts[1].mesh.visible).toBe(true)
  })

  it('frees finished slots, shrinks the drawn count, and grows without losing live projectiles', () => {
    const layer = createOnigiriBodyLayer(2)
    const { root } = makeTemplate()
    layer.syncTemplate(root)
    const a = layer.claim()
    const b = layer.claim()
    const pa = new THREE.Vector3(1, 0.5, 1)
    layer.write(a, pa, new THREE.Euler(0, 1, 0))
    layer.write(b, new THREE.Vector3(3, 0.5, 3), new THREE.Euler())
    const before = instanceMatrix(layer.parts[0], a)

    const c = layer.claim() // 꽉 참 → 두 배(상한 없음)
    expect(layer.capacity).toBe(4)
    expect(c).toBe(2)
    expectMatrixClose(instanceMatrix(layer.parts[0], a), before)

    layer.release(c)
    layer.release(b)
    expect(layer.count).toBe(1) // 끝 슬롯이 비면 그리는 수도 준다
    expect(instanceMatrix(layer.parts[0], b).determinant()).toBe(0)
    layer.release(b) // 두 번 놓아도 안전
    expect(layer.claim()).toBe(1) // 빈 슬롯 재사용
    layer.release(a)
    layer.release(1)
    expect(layer.count).toBe(0)
    layer.write(a, pa, new THREE.Euler()) // 놓은 슬롯에 늦게 쓰는 것은 무시
    expect(layer.count).toBe(0)
  })

  // 리뷰 F3/F4: 그릴 것이 없으면 렌더 목록에서 빠지고(Studio가 숨긴 파츠는 계속 숨김), 매 프레임 GPU로는
  // 실제로 그리는 앞부분만 올린다.
  it('hides empty part meshes (keeping Studio-hidden parts hidden) and uploads only the drawn range', () => {
    const layer = createOnigiriBodyLayer(8)
    const { root, meshes } = makeTemplate()
    layer.syncTemplate(root)
    expect(layer.parts.every((part) => part.mesh.visible === false)).toBe(true) // 0개 → 숨김
    const a = layer.claim()
    const b = layer.claim()
    layer.write(b, new THREE.Vector3(1, 0, 1), new THREE.Euler())
    expect(layer.parts.every((part) => part.mesh.visible === true)).toBe(true)
    const attr = layer.parts[0].mesh.instanceMatrix
    expect(attr.array.length).toBe(8 * 16)
    expect(attr.updateRanges).toEqual([{ start: 0, count: 2 * 16 }])
    meshes[2].visible = false // Studio가 파츠를 숨김
    layer.syncTemplate(root)
    expect(layer.parts[2].mesh.visible).toBe(false)
    layer.release(b)
    expect(layer.parts[2].mesh.visible).toBe(false)
    expect(layer.parts[3].mesh.visible).toBe(true)
    expect(layer.parts[0].mesh.instanceMatrix.updateRanges).toEqual([{ start: 0, count: 16 }])
    layer.release(a)
    expect(layer.parts.every((part) => part.mesh.visible === false)).toBe(true)
    meshes[2].visible = true
    layer.claim()
    layer.syncTemplate(root)
    expect(layer.parts[2].mesh.visible).toBe(true)
  })

  it('ignores a template that is not a three.js object (jsdom test renderer)', () => {
    const layer = createOnigiriBodyLayer(2)
    expect(layer.syncTemplate(null)).toBe(0)
    expect(layer.syncTemplate({})).toBe(0)
    const slot = layer.claim()
    expect(() => layer.write(slot, new THREE.Vector3(), new THREE.Euler())).not.toThrow()
  })

  it('relativeMatrixInto returns the transform of a node seen from the template root', () => {
    const { root, meshes } = makeTemplate()
    const out = new THREE.Matrix4()
    expect(relativeMatrixInto(out, meshes[4], root)).toBe(true)
    root.updateMatrixWorld(true)
    expectMatrixClose(out, meshes[4].matrixWorld)
    expect(relativeMatrixInto(out, meshes[4], new THREE.Group())).toBe(false)
  })
})

// 예전 OnigiriBurstGrain: group(위치·회전·축척) > mesh(축척 [size*1.65, size*0.9, size]) + 쌀알별 재질 불투명도.
function oldGrainState(grain, ageMs) {
  const group = new THREE.Group()
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 5))
  mesh.scale.set(grain.size * 1.65, grain.size * 0.9, grain.size)
  group.add(mesh)
  group.position.set(grain.x, 0.12, grain.z) // 처음 놓인 자리
  let opacity = 1
  const age = ageMs - grain.delayMs
  if (age >= 0) {
    const t = Math.min(1, age / 360)
    const pop = Math.sin(t * Math.PI)
    const dist = grain.speed * t
    opacity = Math.max(0, 1 - t)
    group.position.set(
      grain.x + Math.cos(grain.angle) * dist,
      0.12 + pop * grain.lift,
      grain.z + Math.sin(grain.angle) * dist,
    )
    group.rotation.set(t * grain.spin, grain.angle, t * grain.spin * 0.6)
    group.scale.setScalar(1 + pop * 0.35)
  }
  group.updateMatrixWorld(true)
  return { matrix: mesh.matrixWorld.clone(), opacity }
}

describe('onigiri rice-grain burst instance layer (one draw call for all grains)', () => {
  // toonMat의 그라디언트 캔버스용(노드 환경). 다른 무기 테스트와 같은 스텁.
  beforeAll(() => { vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) }) })
  afterAll(() => { vi.unstubAllGlobals() })

  it('reproduces every grain pose and fade of the old per-grain meshes', () => {
    const grains = createOnigiriBurstGrains({ id: 7, x: 3, z: -2, count: ONIGIRI_BURST_GRAINS })
    const out = new THREE.Matrix4()
    for (const age of [0, 5, 12, 40, 180, 359, 360, 429]) {
      for (const grain of grains) {
        const expected = oldGrainState(grain, age)
        const opacity = grainPoseInto(out, grain, age)
        expect(opacity).toBeCloseTo(expected.opacity, 9)
        expectMatrixClose(out, expected.matrix)
      }
    }
  })

  it('writes all live bursts into one InstancedMesh with per-grain opacity, growing when needed', () => {
    const layer = createOnigiriGrainLayer(16)
    const bursts = [1, 2, 3].map((id) => ({
      id, startMs: 1000 + id * 50, grains: createOnigiriBurstGrains({ id, x: id, z: -id, count: ONIGIRI_BURST_GRAINS }),
    }))
    layer.writeBursts(bursts, 1200)
    expect(layer.count).toBe(48)
    expect(layer.capacity).toBeGreaterThanOrEqual(48)
    expect(layer.group.children).toHaveLength(1)
    const out = new THREE.Matrix4()
    const grain = bursts[2].grains[5]
    const expected = oldGrainState(grain, 1200 - bursts[2].startMs)
    layer.mesh.getMatrixAt(32 + 5, out)
    expectMatrixClose(out, expected.matrix)
    expect(layer.opacityAt(32 + 5)).toBeCloseTo(expected.opacity, 6)
    expect(layer.mesh.renderOrder).toBe(7)

    expect(layer.mesh.instanceMatrix.updateRanges).toEqual([{ start: 0, count: 48 * 16 }])
    expect(layer.mesh.geometry.getAttribute('instanceOpacity').updateRanges).toEqual([{ start: 0, count: 48 }])
    expect(layer.mesh.visible).toBe(true)
    layer.writeBursts([], 1300)
    expect(layer.count).toBe(0)
    expect(layer.mesh.visible).toBe(false)
  })

  it('keeps the old grain material settings and patches the toon shader for per-instance opacity', () => {
    const mat = createOnigiriGrainMaterial()
    expect(mat.isMeshToonMaterial).toBe(true)
    expect(mat.color.getHex()).toBe(0xfffbef)
    expect(mat.emissiveIntensity).toBe(0.2)
    expect([mat.transparent, mat.opacity, mat.depthWrite, mat.toneMapped]).toEqual([true, 1, false, false])
    const shader = {
      vertexShader: THREE.ShaderLib.toon.vertexShader,
      fragmentShader: THREE.ShaderLib.toon.fragmentShader,
    }
    mat.onBeforeCompile(shader)
    expect(shader.vertexShader).toContain('attribute float instanceOpacity;')
    expect(shader.vertexShader).toContain('vInstanceOpacity = instanceOpacity;')
    expect(shader.fragmentShader).toContain('vec4 diffuseColor = vec4( diffuse, opacity * vInstanceOpacity );')
    expect(mat.customProgramCacheKey()).toBe('onigiri-grain-instance-opacity')
  })
})
