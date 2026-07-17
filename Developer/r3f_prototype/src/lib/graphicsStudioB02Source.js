export const STUDIO_B02_ITEM_ID = 'zombie-b02-teacher'

export const STUDIO_B02_PART_IDS = Object.freeze([
  'b02-head',
  'b02-hair-top-plate',
  'b02-hair-left-plate',
  'b02-hair-right-plate',
  'b02-hair-back-plate',
  'b02-bun-block',
  'b02-body',
  'b02-shirt',
  'b02-skirt',
  'b02-suit-tear-l',
  'b02-suit-tear-r',
  'b02-arm-l',
  'b02-hand-l',
  'b02-arm-r',
  'b02-hand-r',
  'b02-leg-l',
  'b02-shoe-l',
  'b02-leg-r',
  'b02-shoe-r',
])

export const STUDIO_B02_SAFE_LEGACY_PART_IDS = Object.freeze([
  'b02-head',
  'b02-body',
  'b02-arm-l',
  'b02-arm-r',
  'b02-leg-l',
  'b02-leg-r',
])

const b02SourceTunings = {
  [STUDIO_B02_ITEM_ID]: {
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    outlineThickness: 1,
    outlineOpacity: 0.96,
    outlineColor: '#050209',
    color: '#ffffff',
    colorStrength: 0,
    saturation: 1,
    brightness: 1,
    emissiveIntensity: 0.14,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    animation: 'normal',
  },
}

Object.values(b02SourceTunings).forEach(Object.freeze)

export const STUDIO_B02_SOURCE_TUNINGS = Object.freeze(b02SourceTunings)

export const STUDIO_B02_SOURCE_METADATA = Object.freeze({
  schema: 'graphics-studio-b02-tunings',
  schemaVersion: 1,
  sourceRevision: 1,
  itemId: STUDIO_B02_ITEM_ID,
  entryCount: 1,
  snapshotSha256: '97d4820ece444aad424f9701359f1909259b4a7111c77af34ffa1c22e3d3c737',
})
