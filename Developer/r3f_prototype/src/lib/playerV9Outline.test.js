import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  PLAYER_OUTLINE_THICKNESS,
  PLAYER_OUTLINE_THICKNESS_PREVIEW,
  addPlayerV9Outlines,
} from './playerV9Outline.js'

// 모델 루트 단위에서 각 파츠의 half-extent를 구한다(노드 자신의 scale 포함).
function halfExtent(surface, root) {
  surface.geometry.computeBoundingBox()
  const size = surface.geometry.boundingBox.getSize(new THREE.Vector3()).multiplyScalar(0.5)
  for (let node = surface; node && node !== root; node = node.parent) size.multiply(node.scale)
  return size
}

function surfaceOffset(surface, root) {
  const hull = surface.children.find((child) => child.userData.studioRenderOutline)
  const half = halfExtent(surface, root)
  return {
    hull,
    half,
    offset: new THREE.Vector3(
      (hull.scale.x - 1) * half.x,
      (hull.scale.y - 1) * half.y,
      (hull.scale.z - 1) * half.z,
    ),
  }
}

function mesh(name, size, options = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial())
  m.name = name
  if (options.scale) m.scale.fromArray(options.scale)
  return m
}

// 머리(큰 파츠) / 타이(작고 납작한 파츠) / 가방 걸쇠(노드 자체가 비균일 축소) —
// 실제 로자리 GLB가 가진 세 가지 유형을 그대로 본뜬 최소 픽스처.
function makeRoot() {
  const root = new THREE.Group()
  const pivot = new THREE.Group()
  pivot.name = 'pivot'
  root.add(pivot)
  pivot.add(mesh('head', [1.29, 1.19, 1.17]))
  pivot.add(mesh('tie', [0.13, 0.43, 0.04]))
  pivot.add(mesh('clasp', [1.59, 1.65, 5.27], { scale: [0.08, 0.08, 0.05] }))
  pivot.add(mesh('Decal_face', [0.5, 0.5, 0.01]))
  return root
}

describe('addPlayerV9Outlines', () => {
  it('gives parts of very different size the same surface offset', () => {
    const root = makeRoot()
    addPlayerV9Outlines(root, PLAYER_OUTLINE_THICKNESS)

    const head = surfaceOffset(root.getObjectByName('head'), root)
    const tie = surfaceOffset(root.getObjectByName('tie'), root)
    // 머리 half-extent는 타이의 약 10배다 — 균일 배율이던 시절 두께가 10배 벌어진 지점이다.
    expect(head.half.x / tie.half.x).toBeGreaterThan(9)
    for (const axis of ['x', 'y', 'z']) {
      expect(head.offset[axis]).toBeCloseTo(PLAYER_OUTLINE_THICKNESS, 6)
      expect(tie.offset[axis]).toBeCloseTo(PLAYER_OUTLINE_THICKNESS, 6)
      expect(Math.abs(head.offset[axis] / tie.offset[axis] - 1)).toBeLessThan(0.1)
    }
  })

  it('divides the offset by the node scale so a shrunk node is not 20x off', () => {
    const root = makeRoot()
    addPlayerV9Outlines(root, PLAYER_OUTLINE_THICKNESS)
    const clasp = surfaceOffset(root.getObjectByName('clasp'), root)
    for (const axis of ['x', 'y', 'z']) expect(clasp.offset[axis]).toBeCloseTo(PLAYER_OUTLINE_THICKNESS, 6)
    // 노드 scale이 [0.08, 0.08, 0.05]이므로 같은 오프셋을 내려면 축별 배율이 서로 달라야 한다.
    expect(clasp.hull.scale.x).not.toBeCloseTo(clasp.hull.scale.z, 3)
  })

  it('derives a non-uniform scale from the bounding box, not a single multiplier', () => {
    const root = makeRoot()
    addPlayerV9Outlines(root, PLAYER_OUTLINE_THICKNESS)
    const tie = surfaceOffset(root.getObjectByName('tie'), root)
    expect(tie.hull.scale.x).not.toBeCloseTo(tie.hull.scale.y, 3)
    expect(tie.hull.scale.z).toBeCloseTo(1 + PLAYER_OUTLINE_THICKNESS / tie.half.z, 6)
    // 납작한 축이 가장 크게 늘어난다(= 오프셋이 축과 무관하게 일정하다는 뜻).
    expect(tie.hull.scale.z).toBeGreaterThan(tie.hull.scale.y)
  })

  it('leaves a degenerate axis at scale 1 instead of exploding into a black blob', () => {
    const root = new THREE.Group()
    const flat = mesh('flat', [0.4, 0.4, 0])
    root.add(flat)
    addPlayerV9Outlines(root, PLAYER_OUTLINE_THICKNESS)
    const hull = flat.children.find((child) => child.userData.studioRenderOutline)
    expect(hull.scale.z).toBe(1)
    expect(hull.scale.x).toBeCloseTo(1 + PLAYER_OUTLINE_THICKNESS / 0.2, 6)
  })

  it('halves the offset for the Studio preview', () => {
    const root = makeRoot()
    addPlayerV9Outlines(root, PLAYER_OUTLINE_THICKNESS_PREVIEW)
    const head = surfaceOffset(root.getObjectByName('head'), root)
    expect(head.offset.x).toBeCloseTo(PLAYER_OUTLINE_THICKNESS / 2, 6)
  })

  it('keeps the stencil contract: no hull on Decal_, ref 3, render order 90/91', () => {
    const root = makeRoot()
    addPlayerV9Outlines(root, PLAYER_OUTLINE_THICKNESS)

    const decal = root.getObjectByName('Decal_face')
    expect(decal.children.some((child) => child.userData.studioRenderOutline)).toBe(false)
    expect(decal.material.stencilRef).toBe(3)
    expect(decal.renderOrder).toBe(90)

    const head = root.getObjectByName('head')
    const hull = head.children.find((child) => child.userData.studioRenderOutline)
    expect(head.material.stencilWrite).toBe(true)
    expect(head.material.stencilRef).toBe(3)
    expect(head.material.stencilFunc).toBe(THREE.AlwaysStencilFunc)
    expect(head.material.stencilZPass).toBe(THREE.ReplaceStencilOp)
    expect(hull.material.stencilRef).toBe(3)
    expect(hull.material.stencilFunc).toBe(THREE.NotEqualStencilFunc)
    expect(hull.material.side).toBe(THREE.BackSide)
    expect(hull.renderOrder).toBe(91)
    expect(hull.frustumCulled).toBe(false)
    expect(hull.geometry).not.toBe(head.geometry)
  })
})
