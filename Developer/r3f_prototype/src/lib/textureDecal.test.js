import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  computeDecalTargetSize,
  getDecalPlacement,
  snapLocalNormalToFaceAxis,
} from './textureDecal.js'

describe('snapLocalNormalToFaceAxis', () => {
  it('snaps a dominant-axis normal to the matching signed axis', () => {
    expect(snapLocalNormalToFaceAxis({ x: 0, y: 0, z: 1 })).toBe('+z')
    expect(snapLocalNormalToFaceAxis({ x: 0, y: 0, z: -1 })).toBe('-z')
    expect(snapLocalNormalToFaceAxis({ x: 0.9, y: 0.1, z: -0.2 })).toBe('+x')
    expect(snapLocalNormalToFaceAxis({ x: -0.7, y: 0.2, z: 0.3 })).toBe('-x')
    expect(snapLocalNormalToFaceAxis({ x: 0.1, y: 0.8, z: 0.2 })).toBe('+y')
    expect(snapLocalNormalToFaceAxis({ x: -0.1, y: -0.8, z: 0.1 })).toBe('-y')
  })

  it('accepts array-form normals', () => {
    expect(snapLocalNormalToFaceAxis([0, 0, -0.6])).toBe('-z')
    expect(snapLocalNormalToFaceAxis([0.4, 0, 0.1])).toBe('+x')
  })

  it('falls back to +z for zero or invalid normals', () => {
    expect(snapLocalNormalToFaceAxis({ x: 0, y: 0, z: 0 })).toBe('+z')
    expect(snapLocalNormalToFaceAxis(null)).toBe('+z')
    expect(snapLocalNormalToFaceAxis({ x: NaN, y: NaN, z: NaN })).toBe('+z')
  })
})

describe('getDecalPlacement', () => {
  const box = { min: [-0.5, -0.5, -0.25], max: [0.5, 0.5, 0.25] }

  it('places a +z decal on the front face with in-plane offset', () => {
    const placement = getDecalPlacement(
      { faceAxis: '+z', offset: [0.1, -0.2], scale: [0.4, 0.4], rotation: 0 },
      box,
      0.01,
    )

    expect(placement.position[0]).toBeCloseTo(0.1)
    expect(placement.position[1]).toBeCloseTo(-0.2)
    expect(placement.position[2]).toBeCloseTo(0.26)
    expect(placement.quaternion).toEqual([0, 0, 0, 1])
  })

  it('places a -x decal on the left face, offset mapped to part-local z/y', () => {
    const placement = getDecalPlacement(
      { faceAxis: '-x', offset: [0.1, 0.2], scale: [0.4, 0.4], rotation: 0 },
      box,
      0.01,
    )

    expect(placement.position[0]).toBeCloseTo(-0.51)
    expect(placement.position[1]).toBeCloseTo(0.2)
    expect(placement.position[2]).toBeCloseTo(0.1)

    // 회전 결과: plane의 +z(법선)가 파트 로컬 -x를 향해야 한다
    const normal = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(new THREE.Quaternion().fromArray(placement.quaternion))
    expect(normal.x).toBeCloseTo(-1)
    expect(normal.y).toBeCloseTo(0)
    expect(normal.z).toBeCloseTo(0)
  })

  it('keeps the face normal while rolling the decal around it', () => {
    const placement = getDecalPlacement(
      { faceAxis: '+z', offset: [0, 0], scale: [0.4, 0.4], rotation: 90 },
      box,
      0.01,
    )
    const quaternion = new THREE.Quaternion().fromArray(placement.quaternion)

    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion)
    expect(normal.z).toBeCloseTo(1)

    // plane 로컬 +x(u)가 파트 로컬 +y로 돌아간다
    const u = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion)
    expect(u.x).toBeCloseTo(0)
    expect(u.y).toBeCloseTo(1)
  })

  it('survives an empty or missing box and bad offsets', () => {
    const placement = getDecalPlacement({ faceAxis: '+y', offset: [NaN, undefined], rotation: NaN }, null)

    expect(placement.position.every(Number.isFinite)).toBe(true)
    expect(placement.quaternion.every(Number.isFinite)).toBe(true)
    expect(placement.position[1]).toBeCloseTo(0.01)
  })
})

describe('computeDecalTargetSize', () => {
  it('keeps small images at original size', () => {
    expect(computeDecalTargetSize(300, 200, 512)).toEqual([300, 200])
    expect(computeDecalTargetSize(512, 512, 512)).toEqual([512, 512])
  })

  it('downscales the longest edge to the limit while keeping ratio', () => {
    expect(computeDecalTargetSize(1024, 512, 512)).toEqual([512, 256])
    expect(computeDecalTargetSize(200, 2000, 512)).toEqual([51, 512])
  })

  it('returns [0, 0] for invalid dimensions', () => {
    expect(computeDecalTargetSize(0, 100)).toEqual([0, 0])
    expect(computeDecalTargetSize(NaN, 100)).toEqual([0, 0])
  })
})
