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
    { kind: 'spot', position: [-6.8, 5.4, -10.8], target: [0, 0, -2.4], color: '#D7EAFF', intensity: 32, distance: 15, angle: 0.55, penumbra: 0.42 },
    { kind: 'point', position: [1.8, 4.3, 7.6], color: '#FFE0AD', intensity: 12, distance: 9, decay: 2 },
  ]),
  stage2: freezeProfile([
    { kind: 'spot', position: [0, 5.2, -17.2], target: [0, 0, -9.8], color: '#C7F3F5', intensity: 28, distance: 14, angle: 0.50, penumbra: 0.48 },
    { kind: 'point', position: [-5.7, 3.2, 2], color: '#D8E5EA', intensity: 8, distance: 7.5, decay: 2 },
  ]),
  stage3: freezeProfile([
    { kind: 'spot', position: [-0.8, 7, -1.2], target: [0, 0, 0], color: '#E6F1FF', intensity: 35, distance: 16, angle: 0.68, penumbra: 0.55 },
    { kind: 'point', position: [5.8, 3.7, 10.8], color: '#FFE1B8', intensity: 10, distance: 8.5, decay: 2 },
  ]),
})

export function getStageLightingProfile(stageId) {
  return STAGE_LIGHTING_PROFILES[stageId] ?? EMPTY_STAGE_LIGHTING_PROFILE
}
