import { describe, expect, it } from 'vitest'
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
    expect(PLAYER_MESH_LAYOUT.lantern.position).toEqual([0, -0.76, 0.18])
    expect(PLAYER_MESH_LAYOUT.lantern.bodySize).toEqual([0.28, 0.30, 0.22])
  })
})
