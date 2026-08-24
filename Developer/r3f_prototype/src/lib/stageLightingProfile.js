export const EMPTY_STAGE_LIGHTING_PROFILE = Object.freeze([])

const freezeLight = (light) => Object.freeze({
  ...light,
  position: Object.freeze(light.position),
  ...(light.target ? { target: Object.freeze(light.target) } : {}),
  castShadow: false,
})

const freezeProfile = (lights) => Object.freeze(lights.map(freezeLight))

export const STAGE_LIGHTING_PROFILES = Object.freeze({
  stage1: freezeProfile([
    { kind: 'spot', position: [-6.8, 5.4, -10.8], target: [0, 0, -2.4], color: '#D7EAFF', intensity: 0.42, distance: 12, angle: 0.70, penumbra: 0.50 },
    { kind: 'point', position: [1.8, 4.3, 7.6], color: '#FFE0AD', intensity: 0.32, distance: 8, decay: 2 },
  ]),
  stage2: freezeProfile([
    { kind: 'spot', position: [0, 5.2, -17.2], target: [0, 0, -9.8], color: '#C7F3F5', intensity: 0.38, distance: 13, angle: 0.58, penumbra: 0.56 },
    { kind: 'point', position: [-5.7, 3.2, 2], color: '#D8E5EA', intensity: 0.22, distance: 6.2, decay: 2 },
  ]),
  stage3: freezeProfile([
    { kind: 'spot', position: [-0.8, 7, -1.2], target: [0, 0, 0], color: '#E6F1FF', intensity: 0.44, distance: 15, angle: 0.86, penumbra: 0.62 },
    { kind: 'point', position: [5.8, 3.7, 10.8], color: '#FFE1B8', intensity: 0.24, distance: 7, decay: 2 },
  ]),
})

export function getStageLightingProfile(stageId) {
  return STAGE_LIGHTING_PROFILES[stageId] ?? EMPTY_STAGE_LIGHTING_PROFILE
}
