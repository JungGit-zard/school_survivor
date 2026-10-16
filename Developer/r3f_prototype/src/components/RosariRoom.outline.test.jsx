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
