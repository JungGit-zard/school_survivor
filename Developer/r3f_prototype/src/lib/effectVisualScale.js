export const REDUCED_EFFECT_VISUAL_SCALE = 1 / 2

export function scaleEffectVisual(value, scale = REDUCED_EFFECT_VISUAL_SCALE) {
  return value * scale
}
