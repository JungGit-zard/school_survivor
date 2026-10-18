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
    { kind: 'spot', position: [-1, 7, -12.5], target: [0, 0, -9], color: '#78DDE8', intensity: 176, distance: 15, angle: 0.84, penumbra: 0.36 },
    { kind: 'spot', position: [-6, 6, 0], target: [-4.5, 0, 0], color: '#E9A6FF', intensity: 154, distance: 13.5, angle: 0.70, penumbra: 0.42 },
    { kind: 'spot', position: [1, 7, 12.5], target: [0, 0, 9], color: '#FFE08A', intensity: 188, distance: 15, angle: 0.84, penumbra: 0.36 },
  ]),
  stage2: freezeProfile([
    { kind: 'spot', position: [0, 7, -18], target: [0, 0, -12], color: '#7EC8FF', intensity: 178, distance: 16, angle: 0.68, penumbra: 0.38 },
    { kind: 'spot', position: [-5, 6, 0], target: [0, 0, 0], color: '#FFC56E', intensity: 172, distance: 14.5, angle: 0.58, penumbra: 0.46 },
    { kind: 'spot', position: [2, 7, 17], target: [0, 0, 12], color: '#7FE7D4', intensity: 174, distance: 16, angle: 0.68, penumbra: 0.38 },
  ]),
  stage3: freezeProfile([
    { kind: 'spot', position: [-1, 8, -17], target: [0, 0, -11], color: '#6FD6FF', intensity: 198, distance: 17, angle: 0.70, penumbra: 0.38 },
    { kind: 'spot', position: [-5, 7, 0], target: [0, 0, 0], color: '#FFD37A', intensity: 186, distance: 15.5, angle: 0.68, penumbra: 0.44 },
    { kind: 'spot', position: [1, 8, 16], target: [0, 0, 13], color: '#FF9A3D', intensity: 196, distance: 16.5, angle: 0.68, penumbra: 0.40 },
  ]),
  stage4: freezeProfile([
    { kind: 'spot', position: [0, 7, -13], target: [0, 0, -10], color: '#8DEBD1', intensity: 168, distance: 14, angle: 0.72, penumbra: 0.42 },
    { kind: 'spot', position: [0, 6.5, 0], target: [0, 0, 0], color: '#FFE27A', intensity: 142, distance: 11, angle: 0.62, penumbra: 0.48 },
    { kind: 'spot', position: [1.5, 7, 12], target: [0, 0, 10], color: '#DFF6FF', intensity: 162, distance: 14, angle: 0.72, penumbra: 0.42 },
  ]),
  stage6: freezeProfile([
    {kind:'spot',position:[-2,7,-14],target:[0,0,-10],color:'#F3D59D',intensity:162,distance:16,angle:.75,penumbra:.5},
    {kind:'spot',position:[5,7,0],target:[0,0,0],color:'#A0BBEF',intensity:145,distance:14,angle:.72,penumbra:.5},
    {kind:'spot',position:[1,7,14],target:[0,0,10],color:'#E6BC69',intensity:168,distance:16,angle:.75,penumbra:.5},
  ]),
  stage7: freezeProfile([
    {kind:'spot',position:[0,7,-14],target:[0,0,-10],color:'#8FE8DA',intensity:150,distance:16,angle:.75,penumbra:.5},
    {kind:'spot',position:[-4,7,0],target:[0,0,0],color:'#AEBFF1',intensity:142,distance:14,angle:.72,penumbra:.5},
    {kind:'spot',position:[1,7,14],target:[0,0,10],color:'#C5ECE7',intensity:158,distance:16,angle:.75,penumbra:.5},
  ]),
  stage8: freezeProfile([
    {kind:'spot',position:[-1,7,-14],target:[0,0,-10],color:'#C2E3D9',intensity:152,distance:16,angle:.75,penumbra:.5},
    {kind:'spot',position:[4,7,0],target:[0,0,0],color:'#F1BBD4',intensity:132,distance:14,angle:.72,penumbra:.5},
    {kind:'spot',position:[0,7,14],target:[0,0,10],color:'#C8EAA2',intensity:148,distance:16,angle:.75,penumbra:.5},
  ]),
  stage9: freezeProfile([
    {kind:'spot',position:[-2,8,-14],target:[0,0,-10],color:'#F0D6A0',intensity:168,distance:16,angle:.75,penumbra:.5},
    {kind:'spot',position:[5,7,0],target:[0,0,0],color:'#CCA4DC',intensity:136,distance:14,angle:.72,penumbra:.5},
    {kind:'spot',position:[0,8,14],target:[0,0,10],color:'#F2C7AA',intensity:170,distance:16,angle:.75,penumbra:.5},
  ]),
  stage10: freezeProfile([
    {kind:'spot',position:[0,8,-14],target:[0,0,-10],color:'#AFE2F5',intensity:166,distance:16,angle:.75,penumbra:.5},
    {kind:'spot',position:[-4,7,0],target:[0,0,0],color:'#B6CEEE',intensity:138,distance:14,angle:.72,penumbra:.5},
    {kind:'spot',position:[1,8,14],target:[0,0,10],color:'#DFE7BC',intensity:156,distance:16,angle:.75,penumbra:.5},
  ]),
})

export function getStageLightingProfile(stageId) {
  return STAGE_LIGHTING_PROFILES[stageId] ?? EMPTY_STAGE_LIGHTING_PROFILE
}
