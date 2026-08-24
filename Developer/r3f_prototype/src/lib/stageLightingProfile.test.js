import { describe, expect, it } from 'vitest'
import {
  EMPTY_STAGE_LIGHTING_PROFILE,
  getStageLightingProfile,
  STAGE_LIGHTING_PROFILES,
} from './stageLightingProfile.js'

const expectedProfiles = {
  stage1: [
    { kind: 'spot', position: [-6.8, 5.4, -10.8], target: [0, 0, -2.4], color: '#D7EAFF', intensity: 0.42, distance: 12, angle: 0.70, penumbra: 0.50 },
    { kind: 'point', position: [1.8, 4.3, 7.6], color: '#FFE0AD', intensity: 0.32, distance: 8, decay: 2 },
  ],
  stage2: [
    { kind: 'spot', position: [0, 5.2, -17.2], target: [0, 0, -9.8], color: '#C7F3F5', intensity: 0.38, distance: 13, angle: 0.58, penumbra: 0.56 },
    { kind: 'point', position: [-5.7, 3.2, 2], color: '#D8E5EA', intensity: 0.22, distance: 6.2, decay: 2 },
  ],
  stage3: [
    { kind: 'spot', position: [-0.8, 7, -1.2], target: [0, 0, 0], color: '#E6F1FF', intensity: 0.44, distance: 15, angle: 0.86, penumbra: 0.62 },
    { kind: 'point', position: [5.8, 3.7, 10.8], color: '#FFE1B8', intensity: 0.24, distance: 7, decay: 2 },
  ],
}

describe('Stage 1~3 theatrical lighting profiles', () => {
  it.each(Object.entries(expectedProfiles))('keeps the approved %s lights exactly', (stageId, expectedLights) => {
    const profile = getStageLightingProfile(stageId)

    expect(profile).toHaveLength(2)
    expect(profile).toEqual(expectedLights.map((light) => ({ ...light, castShadow: false })))
    expect(Object.isFrozen(profile)).toBe(true)
    for (const light of profile) {
      expect(Object.isFrozen(light)).toBe(true)
      expect(light.castShadow).toBe(false)
      expect(Object.isFrozen(light.position)).toBe(true)
      if (light.target) expect(Object.isFrozen(light.target)).toBe(true)
    }
  })

  it('has only the three approved stage profiles, each with at most two static real lights', () => {
    expect(Object.keys(STAGE_LIGHTING_PROFILES)).toEqual(['stage1', 'stage2', 'stage3'])
    expect(Object.isFrozen(STAGE_LIGHTING_PROFILES)).toBe(true)
    for (const profile of Object.values(STAGE_LIGHTING_PROFILES)) {
      expect(profile).toHaveLength(2)
      expect(profile.every(({ kind }) => kind === 'spot' || kind === 'point')).toBe(true)
    }
  })

  it('returns the exact frozen empty profile for Stage 4 and unknown stages', () => {
    expect(getStageLightingProfile('stage4')).toBe(EMPTY_STAGE_LIGHTING_PROFILE)
    expect(getStageLightingProfile('unknown-stage')).toBe(EMPTY_STAGE_LIGHTING_PROFILE)
    expect(EMPTY_STAGE_LIGHTING_PROFILE).toEqual([])
    expect(Object.isFrozen(EMPTY_STAGE_LIGHTING_PROFILE)).toBe(true)
  })
})
