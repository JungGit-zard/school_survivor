import { describe, expect, it } from 'vitest'
import {
  EMPTY_STAGE_LIGHTING_PROFILE,
  getStageLightingProfile,
  STAGE_LIGHTING_PROFILES,
} from './stageLightingProfile.js'

const PLAYABLE_STAGE_IDS = ['stage1', 'stage2', 'stage3', 'stage4']

const expectedProfiles = {
  stage1: [
    { kind: 'spot', position: [-1, 7, -12.5], target: [0, 0, -9], color: '#78DDE8', intensity: 176, distance: 15, angle: 0.84, penumbra: 0.36 },
    { kind: 'spot', position: [-6, 6, 0], target: [-4.5, 0, 0], color: '#E9A6FF', intensity: 154, distance: 13.5, angle: 0.70, penumbra: 0.42 },
    { kind: 'spot', position: [1, 7, 12.5], target: [0, 0, 9], color: '#FFE08A', intensity: 188, distance: 15, angle: 0.84, penumbra: 0.36 },
  ],
  stage2: [
    { kind: 'spot', position: [0, 7, -18], target: [0, 0, -12], color: '#7EC8FF', intensity: 178, distance: 16, angle: 0.68, penumbra: 0.38 },
    { kind: 'spot', position: [-5, 6, 0], target: [0, 0, 0], color: '#FFC56E', intensity: 172, distance: 14.5, angle: 0.58, penumbra: 0.46 },
    { kind: 'spot', position: [2, 7, 17], target: [0, 0, 12], color: '#7FE7D4', intensity: 174, distance: 16, angle: 0.68, penumbra: 0.38 },
  ],
  stage3: [
    { kind: 'spot', position: [-1, 8, -17], target: [0, 0, -11], color: '#6FD6FF', intensity: 198, distance: 17, angle: 0.70, penumbra: 0.38 },
    { kind: 'spot', position: [-5, 7, 0], target: [0, 0, 0], color: '#FFD37A', intensity: 186, distance: 15.5, angle: 0.68, penumbra: 0.44 },
    { kind: 'spot', position: [1, 8, 16], target: [0, 0, 13], color: '#FF9A3D', intensity: 196, distance: 16.5, angle: 0.68, penumbra: 0.40 },
  ],
  stage4: [
    { kind: 'spot', position: [0, 7, -13], target: [0, 0, -10], color: '#8DEBD1', intensity: 168, distance: 14, angle: 0.72, penumbra: 0.42 },
    { kind: 'spot', position: [0, 6.5, 0], target: [0, 0, 0], color: '#FFE27A', intensity: 142, distance: 11, angle: 0.62, penumbra: 0.48 },
    { kind: 'spot', position: [1.5, 7, 12], target: [0, 0, 10], color: '#DFF6FF', intensity: 162, distance: 14, angle: 0.72, penumbra: 0.42 },
  ],
}

describe('Stage 1~4 baked lighting profiles', () => {
  it.each(PLAYABLE_STAGE_IDS)('keeps %s to three static baked color-zone SpotLight descriptors', (stageId) => {
    const profile = getStageLightingProfile(stageId)

    expect(profile).toHaveLength(3)
    expect(profile).toEqual(expectedProfiles[stageId].map((light) => ({ ...light, castShadow: false })))
    expect(Object.isFrozen(profile)).toBe(true)
    for (const light of profile) {
      expect(Object.isFrozen(light)).toBe(true)
      expect(light.kind).toBe('spot')
      expect(light.castShadow).toBe(false)
      expect(Object.isFrozen(light.position)).toBe(true)
      expect(Object.isFrozen(light.target)).toBe(true)
    }
  })

  it('has only the four playable-stage profiles, each with exactly three static baked light zones', () => {
    expect(Object.keys(STAGE_LIGHTING_PROFILES)).toEqual(['stage1', 'stage2', 'stage3', 'stage4'])
    expect(Object.isFrozen(STAGE_LIGHTING_PROFILES)).toBe(true)
    for (const profile of Object.values(STAGE_LIGHTING_PROFILES)) {
      expect(profile).toHaveLength(3)
      expect(profile.every(({ kind }) => kind === 'spot')).toBe(true)
    }
  })

  it('returns the exact frozen empty profile for unknown stages only', () => {
    expect(getStageLightingProfile('unknown-stage')).toBe(EMPTY_STAGE_LIGHTING_PROFILE)
    expect(EMPTY_STAGE_LIGHTING_PROFILE).toEqual([])
    expect(Object.isFrozen(EMPTY_STAGE_LIGHTING_PROFILE)).toBe(true)
  })
})
