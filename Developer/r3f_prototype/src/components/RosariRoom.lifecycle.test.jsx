import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import * as Room from './RosariRoom.jsx'
vi.mock('@react-three/drei', () => ({ Html: ({ children }) => children, useGLTF: Object.assign(vi.fn(), { preload: vi.fn() }) }))

function fixture() {
  const source = new THREE.Group()
  const geometry = new THREE.BoxGeometry()
  const map = new THREE.Texture()
  const material = new THREE.MeshStandardMaterial({ map })
  const surface = new THREE.Mesh(geometry, material)
  surface.name = 'left_shoulder_pivot'
  source.add(surface)
  const parent = new THREE.Group(), limbs = {}
  const cachedDisposed = vi.fn()
  for (const resource of [geometry, map, material]) resource.addEventListener('dispose', cachedDisposed)
  const setup = () => Room.mountRosariModel(parent, source, limbs, { getSize: (v) => v.set(390, 844) })
  return { source, geometry, map, material, parent, limbs, cachedDisposed, setup }
}
function watch(root) {
  const owned = [], disposed = []
  root.traverse((node) => {
    if (!node.isMesh) return
    const resources = [...(Array.isArray(node.material) ? node.material : [node.material]), ...(node.userData.isOutline ? [node.geometry] : [])]
    for (const resource of resources) {
      owned.push(resource)
      resource.addEventListener('dispose', () => disposed.push(resource))
    }
  })
  return { owned, disposed }
}

describe('Rosari effect-owned resources', () => {
  it('setup-cleanup-setup replaces disposed resources instead of reattaching the memo clone', () => {
    const f = fixture()
    const firstCleanup = f.setup(), first = f.parent.children[0], a = watch(first)
    expect(f.limbs.leftShoulder).toBe(first.children[0])
    firstCleanup()
    expect(f.parent.children).toHaveLength(0)
    expect(f.limbs).toEqual({})
    expect(a.disposed).toHaveLength(a.owned.length)
    const finalCleanup = f.setup(), second = f.parent.children[0], b = watch(second)
    expect(second).not.toBe(first)
    expect(b.owned.every((resource) => !a.owned.includes(resource))).toBe(true)
    expect(b.disposed).toEqual([])
    expect(f.limbs.leftShoulder).toBe(second.children[0])
    finalCleanup()
    expect(b.disposed).toHaveLength(b.owned.length)
    expect(a.disposed).toHaveLength(a.owned.length)
    expect(f.cachedDisposed).not.toHaveBeenCalled()
  })

  it('true unmount/remount preserves cached geometry, material and maps without mutating the source', () => {
    const f = fixture()
    for (let i = 0; i < 3; i += 1) {
      const cleanup = f.setup(), root = f.parent.children[0], surface = root.children[0], w = watch(root)
      expect(surface.geometry).toBe(f.geometry)
      expect(surface.material.map).toBe(f.map)
      expect(surface.material).not.toBe(f.material)
      expect(f.source.children[0].material).toBe(f.material)
      expect(f.source.children[0].children).toHaveLength(0)
      expect(f.parent.scale.y).toBeCloseTo(1.32)
      cleanup()
      expect(w.disposed).toHaveLength(w.owned.length)
      expect(new Set(w.disposed).size).toBe(w.owned.length)
      expect(f.cachedDisposed).not.toHaveBeenCalled()
    }
  })
})
