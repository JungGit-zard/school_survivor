const PROP_OUTLINE_PADDING = 0.045

export const STAGE_PROP_MESH_RENDERING = Object.freeze({
  castShadow: false,
  receiveShadow: false,
})

export function getPropOutlineScale(scale) {
  if (Array.isArray(scale)) return scale.map(getPropOutlineScale)
  return Math.max(0.01, scale + PROP_OUTLINE_PADDING)
}
