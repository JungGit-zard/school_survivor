import { describe, expect, it } from 'vitest'
import {
  EMPTY_STAGE_LIGHTING_PROFILE,
  getStageLightingProfile,
  STAGE_LIGHTING_PROFILES,
} from './stageLightingProfile.js'

const PLAYABLE_STAGE_IDS = ['stage1', 'stage2', 'stage3']

const expectedProfiles = {
  stage1: [
    { kind: 'spot', position: [-1, 7, -12.5], target: [0, 0, -9], color: '#3CCBFF', intensity: 92, distance: 15, angle: 0.85, penumbra: 0.32 },
    { kind: 'spot', position: [-7, 6, 0], target: [0, 0, 0], color: '#B96CFF', intensity: 84, distance: 14, angle: 0.72, penumbra: 0.36 },
    { kind: 'spot', position: [1, 7, 12.5], target: [0, 0, 9], color: '#FFD166', intensity: 92, distance: 15, angle: 0.85, penumbra: 0.32 },
  ],
  stage2: [
    { kind: 'spot', position: [0, 7, -18], target: [0, 0, -12], color: '#D85CFF', intensity: 95, distance: 16, angle: 0.72, penumbra: 0.34 },
    { kind: 'spot', position: [-6, 6, 0], target: [0, 0, 0], color: '#FFB45B', intensity: 82, distance: 15, angle: 0.78, penumbra: 0.38 },
    { kind: 'spot', position: [2, 7, 17], target: [0, 0, 12], color: '#5E86FF', intensity: 90, distance: 16, angle: 0.70, penumbra: 0.34 },
  ],
  stage3: [
    { kind: 'spot', position: [-1, 8, -17], target: [0, 0, -11], color: '#54C7FF', intensity: 105, distance: 17, angle: 0.72, penumbra: 0.34 },
    { kind: 'spot', position: [-7, 7, 0], target: [0, 0, 0], color: '#A77BFF', intensity: 92, distance: 16, angle: 0.70, penumbra: 0.38 },
    { kind: 'spot', position: [1, 8, 17], target: [0, 0, 11], color: '#F08CFF', intensity: 105, distance: 17, angle: 0.72, penumbra: 0.34 },
  ],
}

describe('Stage 1~3 theatrical lighting profiles', () => {
  it.each(PLAYABLE_STAGE_IDS)('keeps %s to three static color-zone SpotLights', (stageId) => {
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

  it('has only the three playable-stage profiles, each with exactly three static SpotLights', () => {
    expect(Object.keys(STAGE_LIGHTING_PROFILES)).toEqual(['stage1', 'stage2', 'stage3'])
    expect(Object.isFrozen(STAGE_LIGHTING_PROFILES)).toBe(true)
    for (const profile of Object.values(STAGE_LIGHTING_PROFILES)) {
      expect(profile).toHaveLength(3)
      expect(profile.every(({ kind }) => kind === 'spot')).toBe(true)
    }
  })

  it('returns the exact frozen empty profile for Stage 4 and unknown stages', () => {
    expect(getStageLightingProfile('stage4')).toBe(EMPTY_STAGE_LIGHTING_PROFILE)
    expect(getStageLightingProfile('unknown-stage')).toBe(EMPTY_STAGE_LIGHTING_PROFILE)
    expect(EMPTY_STAGE_LIGHTING_PROFILE).toEqual([])
    expect(Object.isFrozen(EMPTY_STAGE_LIGHTING_PROFILE)).toBe(true)
  })
})
