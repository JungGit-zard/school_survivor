import { describe, expect, it } from 'vitest'
import { getProceduralFaceZombieWalkPose } from './ProceduralFaceTestZombie.jsx'

describe('ProceduralFaceTestZombie walk pose', () => {
  it('matches basic zombie gait with opposed legs and forward arm drift', () => {
    const quarterStrideTime = Math.PI / 2 / 7.0
    const pose = getProceduralFaceZombieWalkPose(quarterStrideTime)

    expect(pose.legLRotX).toBeGreaterThan(0.37)
    expect(pose.legRRotX).toBeLessThan(-0.37)
    expect(Number((pose.legLRotX + pose.legRRotX).toFixed(6))).toBe(0)
    expect(pose.armLRotX).toBeLessThan(-1.09)
    expect(pose.armRRotX).toBeLessThan(-1.15)
    expect(pose.bodyY).toBeGreaterThan(0.327)
    expect(pose.headY).toBeGreaterThan(0.877)
  })

  it('keeps the smiling shader zombie subtle rather than using runner-sized motion', () => {
    const samples = Array.from({ length: 12 }, (_, index) => getProceduralFaceZombieWalkPose(index * 0.17))

    for (const pose of samples) {
      expect(Math.abs(pose.legLRotX)).toBeLessThanOrEqual(0.38)
      expect(Math.abs(pose.legRRotX)).toBeLessThanOrEqual(0.38)
      expect(Math.abs(pose.bodyRotZ)).toBeLessThanOrEqual(0.018)
      expect(Math.abs(pose.headRotZ)).toBeLessThanOrEqual(0.07)
      expect(pose.bodyY).toBeGreaterThanOrEqual(0.3)
      expect(pose.bodyY).toBeLessThanOrEqual(0.328)
    }
  })
})
