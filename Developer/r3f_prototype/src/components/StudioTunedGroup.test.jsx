import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { applyStudioTuning, getStudioTransformProps } from './StudioTunedGroup.jsx'

describe('StudioTunedGroup', () => {
  it('combines global scale, per-axis scale, and default rotation angles', () => {
    const transform = getStudioTransformProps({
      scale: 1.5,
      scaleX: 2,
      scaleY: 1,
      scaleZ: 0.5,
      rotationX: 90,
      rotationY: -90,
      rotationZ: 180,
    })

    expect(transform.scale).toEqual([3, 1.5, 0.75])
    expect(transform.rotation[0]).toBeCloseTo(Math.PI / 2)
    expect(transform.rotation[1]).toBeCloseTo(-Math.PI / 2)
    expect(transform.rotation[2]).toBeCloseTo(Math.PI)
  })

  it('applies confirmed studio material tuning outside the studio preview', () => {
    const root = new THREE.Group()
    const bodyMat = new THREE.MeshToonMaterial({
      color: 0x223344,
      emissive: 0x000000,
      emissiveIntensity: 0,
    })
    const outlineMat = new THREE.MeshBasicMaterial({
      color: 0x050209,
      side: THREE.BackSide,
      transparent: true,
      opacity: 1,
    })
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bodyMat)
    const outline = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), outlineMat)

    root.add(body, outline)
    applyStudioTuning(root, {
      color: '#ff0000',
      colorStrength: 1,
      outlineColor: '#00ff00',
      outlineOpacity: 0.5,
      outlineThickness: 2,
      emissiveIntensity: 0.4,
    })

    expect(bodyMat.color.getHexString()).toBe('ff0000')
    expect(bodyMat.emissiveIntensity).toBe(0.4)
    expect(outlineMat.color.getHexString()).toBe('00ff00')
    expect(outlineMat.opacity).toBe(0.5)
    expect(outline.scale.x).toBeCloseTo(1.12)
  })
})
