import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { PLAYER_MESH_LAYOUT } from './PlayerMesh.jsx'

describe('PlayerMesh layout', () => {
  it('keeps the player head connected to the torso during idle and walk bobbing', () => {
    const bodyTop = PLAYER_MESH_LAYOUT.body.position[1] + PLAYER_MESH_LAYOUT.body.size[1] / 2
    const headLowestPointAtPeakBob =
      PLAYER_MESH_LAYOUT.head.baseY + PLAYER_MESH_LAYOUT.motion.maxHeadBobY - PLAYER_MESH_LAYOUT.head.size[1] / 2

    expect(headLowestPointAtPeakBob).toBeLessThanOrEqual(bodyTop)
  })

  it('derives animation and outline offsets from the shared head layout', () => {
    expect(PLAYER_MESH_LAYOUT.motion.maxHeadBobY).toBe(
      Math.max(PLAYER_MESH_LAYOUT.motion.idleBreatheY, PLAYER_MESH_LAYOUT.motion.walkBobY)
    )
    expect(PLAYER_MESH_LAYOUT.outline.headPosition[1]).toBeCloseTo(
      PLAYER_MESH_LAYOUT.head.baseY + PLAYER_MESH_LAYOUT.outline.headOffsetY
    )
  })

  it('places the lantern prop at the right hand tip', () => {
    expect(PLAYER_MESH_LAYOUT.lantern.position).toEqual([0, -0.76, 0.2])
    expect(PLAYER_MESH_LAYOUT.lantern.bodySize).toEqual([0.34, 0.2, 0.24])
    expect(PLAYER_MESH_LAYOUT.lantern.headSize).toEqual([0.18, 0.24, 0.28])
    expect(PLAYER_MESH_LAYOUT.lantern.handleSize).toEqual([0.24, 0.06, 0.11])
  })

  it('renders a light cone from the hand flashlight model', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')

    expect(source).toContain('PlayerLanternLight')
    expect(source).toContain('coneGeometry')
    expect(PLAYER_MESH_LAYOUT.lantern.lightLength).toBeCloseTo(2.08 / 3 / 0.2664)
    expect(PLAYER_MESH_LAYOUT.lantern.lightRadius).toBeCloseTo((3.6 / 2) / 3 / 0.2664)
  })

  it('keeps the floor shadow visible on the classroom floor without drawing over the player body', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')
    const shadowMaterial = source.match(/const shadowMat[\s\S]*?new THREE\.MeshBasicMaterial\(\{([\s\S]*?)\}\)/)?.[1] ?? ''

    expect(PLAYER_MESH_LAYOUT.floorShadow.position[1]).toBeLessThan(-1.1)
    expect(PLAYER_MESH_LAYOUT.floorShadow.scale[0]).toBeGreaterThan(PLAYER_MESH_LAYOUT.floorShadow.scale[1])
    expect(PLAYER_MESH_LAYOUT.floorShadow.opacity).toBeGreaterThanOrEqual(0.4)
    expect(shadowMaterial).toContain('depthTest: true')
    expect(shadowMaterial).toContain('depthWrite: false')
    expect(shadowMaterial).toContain('polygonOffset: true')
    expect(source).toContain('position={PLAYER_MESH_LAYOUT.floorShadow.position}')
    expect(source).toContain('renderOrder={1}')
  })
})
