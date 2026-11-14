import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import * as Room from './RosariRoom.jsx'
vi.mock('@react-three/drei', () => ({ Html: ({ children }) => children, useGLTF: Object.assign(vi.fn(), { preload: vi.fn() }) }))
import {
  calculateRosariOutlineClipOffset,
  getRosariOutlineViewport,
  ROSARI_OUTLINE_WIDTH_CSS_PX,
  makeOutlineMaterial,
  updateOutlineUniforms,
} from './RosariRoom.jsx'

describe('RosariRoom screen-space outline CSS pixel math', () => {
  it('disposes room-owned hull geometry/materials without disposing cached GLB geometry or textures', () => {
    const root = new THREE.Group()
    const cachedGeometry = new THREE.BoxGeometry()
    const cachedTexture = new THREE.Texture()
    const surfaceMaterial = new THREE.MeshToonMaterial({ map: cachedTexture })
    const surface = new THREE.Mesh(cachedGeometry, surfaceMaterial)
    const hull = new THREE.Mesh(cachedGeometry.clone(), makeOutlineMaterial())
    hull.userData.isOutline = true
    surface.add(hull); root.add(surface)
    const sharedDisposed = vi.fn(), textureDisposed = vi.fn(), hullDisposed = vi.fn(), materialDisposed = vi.fn()
    cachedGeometry.addEventListener('dispose', sharedDisposed)
    cachedTexture.addEventListener('dispose', textureDisposed)
    hull.geometry.addEventListener('dispose', hullDisposed)
    surfaceMaterial.addEventListener('dispose', materialDisposed)
    hull.material.addEventListener('dispose', materialDisposed)
    try {
      Room.disposeRosariModel(root)
      expect(hullDisposed).toHaveBeenCalledTimes(1)
      expect(materialDisposed).toHaveBeenCalledTimes(2)
      expect(sharedDisposed).not.toHaveBeenCalled()
      expect(textureDisposed).not.toHaveBeenCalled()
    } finally { cachedGeometry.dispose(); cachedTexture.dispose() }
  })
  it('disposes shared clone materials and hull geometry only once per cleanup', () => {
    const root = new THREE.Group()
    const cachedGeometry = new THREE.BoxGeometry()
    const cachedMap = new THREE.Texture()
    const material = new THREE.MeshToonMaterial({ map: cachedMap })
    const hullGeometry = cachedGeometry.clone()
    const hullMaterial = makeOutlineMaterial()
    const geometryDisposed = vi.fn(), materialDisposed = vi.fn(), hullMaterialDisposed = vi.fn()
    const cachedDisposed = vi.fn(), mapDisposed = vi.fn()
    hullGeometry.addEventListener('dispose', geometryDisposed)
    material.addEventListener('dispose', materialDisposed)
    hullMaterial.addEventListener('dispose', hullMaterialDisposed)
    cachedGeometry.addEventListener('dispose', cachedDisposed)
    cachedMap.addEventListener('dispose', mapDisposed)
    for (let i = 0; i < 2; i += 1) {
      const surface = new THREE.Mesh(cachedGeometry, [material, material])
      const hull = new THREE.Mesh(hullGeometry, hullMaterial)
      hull.userData.isOutline = true
      surface.add(hull); root.add(surface)
    }
    try {
      Room.disposeRosariModel(root)
      expect(geometryDisposed).toHaveBeenCalledTimes(1)
      expect(materialDisposed).toHaveBeenCalledTimes(1)
      expect(hullMaterialDisposed).toHaveBeenCalledTimes(1)
      expect(cachedDisposed).not.toHaveBeenCalled()
      expect(mapDisposed).not.toHaveBeenCalled()
    } finally { cachedGeometry.dispose(); cachedMap.dispose() }
  })
  it('initializes the actual shader at current CSS size, then updates on resize without DPR multiplication', () => {
    let size = new THREE.Vector2(219, 220)
    const material = makeOutlineMaterial(() => size)
    const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <project_vertex>' }
    material.onBeforeCompile(shader)
    expect(shader.uniforms.outlineViewport.value.toArray()).toEqual([219, 220])
    expect(shader.vertexShader).toContain('2.0 * outlineWidthPx / outlineViewport')
    expect(shader.vertexShader).not.toContain('outlineDpr')
    expect(shader.vertexShader).toContain('normalMatrix * outlineNormal')
    expect(shader.vertexShader).not.toContain('mat3( modelViewMatrix ) * outlineNormal')
    const root = new THREE.Group()
    const hull = new THREE.Mesh(new THREE.BoxGeometry(), material)
    hull.userData.isOutline = true
    root.add(hull)
    updateOutlineUniforms(root, { width: 640, height: 280 })
    expect(shader.uniforms.outlineViewport.value.toArray()).toEqual([640, 280])
    size = new THREE.Vector2(640, 280)
    const recompiled = { uniforms: {}, vertexShader: '#include <common>\n#include <project_vertex>' }
    material.onBeforeCompile(recompiled)
    expect(recompiled.uniforms.outlineViewport.value.toArray()).toEqual([640, 280])
    expect(recompiled.uniforms.outlineWidthPx.value).toBe(2)
    hull.geometry.dispose(); material.dispose()
  })
  it.each([1, 1.5, 2, 3])('keeps a 2 CSS px outline invariant at DPR %s', (dpr) => {
    const viewport = getRosariOutlineViewport({ width: 511.875, height: 910 })
    const clipW = 0.73
    const offset = calculateRosariOutlineClipOffset({
      direction: { x: 1, y: 0 },
      outlineWidthPx: ROSARI_OUTLINE_WIDTH_CSS_PX,
      viewport,
      clipW,
      dpr,
    })
    const cssPxFromClip = offset.x / clipW * viewport.width / 2

    expect(cssPxFromClip).toBeCloseTo(2, 10)
  })

  it('uses actual CSS canvas size for first shader viewport instead of a 1x1 fallback when size is valid', () => {
    expect(getRosariOutlineViewport({ width: 511.875, height: 910 })).toEqual({ width: 511.875, height: 910 })
  })

  it('falls back to 1x1 only when CSS canvas dimensions are unavailable or invalid', () => {
    expect(getRosariOutlineViewport({ width: 0, height: NaN })).toEqual({ width: 1, height: 1 })
    expect(getRosariOutlineViewport(null)).toEqual({ width: 1, height: 1 })
  })

  it('matches the shader extrusion formula: 2 * width / viewport times clipW, without world inflation', () => {
    const viewport = getRosariOutlineViewport({ width: 300, height: 150 })
    const offset = calculateRosariOutlineClipOffset({
      direction: { x: 0, y: -1 },
      outlineWidthPx: ROSARI_OUTLINE_WIDTH_CSS_PX,
      viewport,
      clipW: 0.5,
      dpr: 3,
    })

    expect(offset.x).toBe(0)
    expect(offset.y).toBeCloseTo(-(2 * ROSARI_OUTLINE_WIDTH_CSS_PX / viewport.height) * 0.5, 10)
  })
})

describe('RosariRoom bedroom props: toon ramp and outlines', () => {
  const OUTLINED_PROPS = ['room', 'wardrobe', 'bed', 'nightstand', 'radio', 'vanity', 'pouf', 'plush', 'window', 'art']
  // Only true flat decals / inner panels skip the hull; each sits on an outlined parent.
  const FLAT_TOON = ['canvas', 'mirrorFrame', 'cream']
  it('outlines every real prop and keeps all room meshes to 4 draw calls', () => {
    const room = Room.createRosariBedroom(() => ({ width: 640, height: 480 }))
    try {
      const meshes = room.group.children
      expect(meshes.map((m) => m.name)).toEqual(['rosari_bedroom_toon', 'rosari_bedroom_unlit', 'rosari_bedroom_shadows', 'rosari_bedroom_outline'])
      for (const prop of OUTLINED_PROPS) {
        expect(room.parts.some((part) => part.prop === prop && part.outline), prop).toBe(true)
      }
      for (const part of room.parts) {
        if (part.layer === 'toon' && !part.outline) expect(FLAT_TOON, `${part.prop}/${part.color}`).toContain(part.color)
        if (part.layer === 'shadow') expect(part.outline).toBe(false)
      }
      // Every toon prop body is outlined: the hull holds exactly the outlined parts' vertices.
      const hull = room.group.getObjectByName('rosari_bedroom_outline')
      const outlinedVertexCount = room.parts.filter((part) => part.outline).reduce((sum, part) => {
        const g = part.geometry
        return sum + (g.index ? g.index.count : g.attributes.position.count)
      }, 0)
      expect(hull.geometry.attributes.position.count).toBe(outlinedVertexCount)
      expect(hull.geometry.attributes.outlineNormal).toBeTruthy()
      expect(hull.userData.isOutline).toBe(true)
      expect(hull.material.side).toBe(THREE.BackSide)
    } finally { room.dispose() }
  })

  it('uses the ARCHIVE 5-step toon ramp, no tone mapping, and never touches the outline stencil', () => {
    const room = Room.createRosariBedroom()
    try {
      const toon = room.group.getObjectByName('rosari_bedroom_toon').material
      expect(toon.isMeshToonMaterial).toBe(true)
      expect(toon.gradientMap).toBeTruthy()
      expect(Array.from(toon.gradientMap.image.data.filter((_, i) => i % 4 === 0))).toEqual([45, 105, 170, 225, 255])
      expect(toon.vertexColors).toBe(true)
      for (const mesh of room.group.children) {
        // Rosari's surfaces own stencil ref 3; the room must not write it (her hull must still draw
        // over furniture behind her) and the room hull must not test it (a prop in front of her keeps
        // its outline across her).
        expect(mesh.material.stencilWrite, mesh.name).toBe(false)
        if (mesh.name !== 'rosari_bedroom_outline') expect(mesh.material.toneMapped, mesh.name).toBe(false)
      }
    } finally { room.dispose() }
  })

  it('builds hulls only from closed shapes (no open circles or planes get a BackSide hull)', () => {
    const room = Room.createRosariBedroom()
    try {
      for (const part of room.parts.filter((p) => p.outline)) {
        const type = part.geometry.type
        expect(['CircleGeometry', 'PlaneGeometry'], `${part.prop}/${part.color}`).not.toContain(type)
      }
    } finally { room.dispose() }
  })
})
