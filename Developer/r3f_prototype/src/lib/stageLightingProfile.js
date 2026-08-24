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
    { kind: 'spot', position: [-1, 7, -12.5], target: [0, 0, -9], color: '#3CCBFF', intensity: 92, distance: 15, angle: 0.85, penumbra: 0.32 },
    { kind: 'spot', position: [-7, 6, 0], target: [0, 0, 0], color: '#B96CFF', intensity: 84, distance: 14, angle: 0.72, penumbra: 0.36 },
    { kind: 'spot', position: [1, 7, 12.5], target: [0, 0, 9], color: '#FFD166', intensity: 92, distance: 15, angle: 0.85, penumbra: 0.32 },
  ]),
  stage2: freezeProfile([
    { kind: 'spot', position: [0, 7, -18], target: [0, 0, -12], color: '#D85CFF', intensity: 95, distance: 16, angle: 0.72, penumbra: 0.34 },
    { kind: 'spot', position: [-6, 6, 0], target: [0, 0, 0], color: '#FFB45B', intensity: 82, distance: 15, angle: 0.78, penumbra: 0.38 },
    { kind: 'spot', position: [2, 7, 17], target: [0, 0, 12], color: '#5E86FF', intensity: 90, distance: 16, angle: 0.70, penumbra: 0.34 },
  ]),
  stage3: freezeProfile([
    { kind: 'spot', position: [-1, 8, -17], target: [0, 0, -11], color: '#54C7FF', intensity: 105, distance: 17, angle: 0.72, penumbra: 0.34 },
    { kind: 'spot', position: [-7, 7, 0], target: [0, 0, 0], color: '#A77BFF', intensity: 92, distance: 16, angle: 0.70, penumbra: 0.38 },
    { kind: 'spot', position: [1, 8, 17], target: [0, 0, 11], color: '#F08CFF', intensity: 105, distance: 17, angle: 0.72, penumbra: 0.34 },
  ]),
})

export function getStageLightingProfile(stageId) {
  return STAGE_LIGHTING_PROFILES[stageId] ?? EMPTY_STAGE_LIGHTING_PROFILE
}
