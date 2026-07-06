// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { computePartLocalBox, disposeTextureDecals, syncTextureDecals } from './TextureDecal.jsx'

const IMAGE_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='

function makePartRoot(partId = 'b02-head') {
  const root = new THREE.Group()
  const part = new THREE.Group()
  part.userData.studioPartId = partId
  part.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()))
  root.add(part)
  return { root, part }
}

function findDecalMeshes(root) {
  const found = []
  root.traverse((object) => {
    if (object.userData.studioTextureDecal) found.push(object)
  })
  return found
}

const baseDecal = Object.freeze({
  partId: 'b02-head',
  faceAxis: '+z',
  imageDataUrl: IMAGE_DATA_URL,
  offset: [0.1, 0.2],
  scale: [0.5, 0.7],
  rotation: 0,
})

describe('syncTextureDecals', () => {
  it('creates a masked plane on the anchored part face', () => {
    const { root, part } = makePartRoot()

    syncTextureDecals(root, [baseDecal])

    const decals = findDecalMeshes(root)
    expect(decals).toHaveLength(1)
    const mesh = decals[0]
    expect(mesh.parent).toBe(part)
    expect(mesh.geometry.type).toBe('PlaneGeometry')
    expect(mesh.position.x).toBeCloseTo(0.1)
    expect(mesh.position.y).toBeCloseTo(0.2)
    expect(mesh.position.z).toBeCloseTo(0.51)
    expect(mesh.scale.x).toBeCloseTo(0.5)
    expect(mesh.scale.y).toBeCloseTo(0.7)
    expect(mesh.material.transparent).toBe(true)
    expect(mesh.material.toneMapped).toBe(false)
    expect(mesh.material.map).toBeTruthy()
  })

  it('is a no-op for identical input and rebuilds when the decal changes', () => {
    const { root } = makePartRoot()
    const decals = [baseDecal]

    syncTextureDecals(root, decals)
    const first = findDecalMeshes(root)[0]
    syncTextureDecals(root, decals)
    expect(findDecalMeshes(root)[0]).toBe(first)

    syncTextureDecals(root, [{ ...baseDecal, faceAxis: '-x', offset: [0, 0] }])
    const rebuilt = findDecalMeshes(root)
    expect(rebuilt).toHaveLength(1)
    expect(rebuilt[0]).not.toBe(first)
    expect(rebuilt[0].position.x).toBeCloseTo(-0.51)
  })

  it('removes and disposes decal resources when the layer is deleted', () => {
    const { root } = makePartRoot()
    syncTextureDecals(root, [baseDecal])
    const mesh = findDecalMeshes(root)[0]
    const geometryDispose = vi.spyOn(mesh.geometry, 'dispose')
    const materialDispose = vi.spyOn(mesh.material, 'dispose')
    const textureDispose = vi.spyOn(mesh.material.map, 'dispose')

    syncTextureDecals(root, [])

    expect(findDecalMeshes(root)).toHaveLength(0)
    expect(geometryDispose).toHaveBeenCalled()
    expect(materialDispose).toHaveBeenCalled()
    expect(textureDispose).toHaveBeenCalled()
  })

  it('recreates the decal when the anchored part is remounted', () => {
    const { root, part } = makePartRoot()
    const decals = [baseDecal]
    syncTextureDecals(root, decals)

    root.remove(part)
    const replacement = new THREE.Group()
    replacement.userData.studioPartId = 'b02-head'
    replacement.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()))
    root.add(replacement)

    syncTextureDecals(root, decals)

    const meshes = findDecalMeshes(root)
    expect(meshes).toHaveLength(1)
    expect(meshes[0].parent).toBe(replacement)
  })

  it('skips decals whose part id is missing and non-traversable roots', () => {
    const { root } = makePartRoot('other-part')

    syncTextureDecals(root, [baseDecal])
    expect(findDecalMeshes(root)).toHaveLength(0)

    expect(() => syncTextureDecals(document.createElement('div'), [baseDecal])).not.toThrow()
    expect(() => syncTextureDecals(null, [baseDecal])).not.toThrow()
  })

  it('disposes every decal on teardown', () => {
    const { root } = makePartRoot()
    syncTextureDecals(root, [baseDecal])
    expect(findDecalMeshes(root)).toHaveLength(1)

    disposeTextureDecals(root)
    expect(findDecalMeshes(root)).toHaveLength(0)
  })
})

describe('computePartLocalBox', () => {
  it('excludes decal planes and focus outlines from the part bounds', () => {
    const { root, part } = makePartRoot()
    syncTextureDecals(root, [{ ...baseDecal, scale: [4, 4] }])

    const box = computePartLocalBox(part)
    expect(box.max.z).toBeCloseTo(0.5)
    expect(box.max.x).toBeCloseTo(0.5)
  })
})

describe('texture decal runtime wiring', () => {
  it('keeps StudioTunedGroup syncing saved decals for in-game rendering', () => {
    const source = readFileSync('src/components/StudioTunedGroup.jsx', 'utf8')

    expect(source).toContain('syncTextureDecals(groupRef.current, decals)')
    expect(source).toContain('TEXTURE_DECALS_EVENT')
    expect(source).toContain('disposeTextureDecals')
    expect(source).toContain('if (object.userData.studioTextureDecal) return')
  })

  it('keeps the studio preview syncing live decals and snapping face normals', () => {
    const source = readFileSync('src/components/GraphicsStudioPreview.jsx', 'utf8')

    expect(source).toContain('syncTextureDecals(rootRef.current, decals)')
    expect(source).toContain('snapLocalNormalToFaceAxis')
    expect(source).toContain('faceAxis: getDoubleClickFaceAxis(event, part ?? event.object)')
  })
})
