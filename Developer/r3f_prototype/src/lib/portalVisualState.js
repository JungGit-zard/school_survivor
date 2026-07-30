export const PORTAL_VISUAL_STATE = Object.freeze({
  idle: Object.freeze({
    color: '#00ffcc',
    ringEmissiveIntensity: 1.5,
    glowEmissiveIntensity: 0.75,
    glowOpacity: 0.35,
    lightIntensity: 2.5,
  }),
  sucking: Object.freeze({
    color: '#ffffff',
    ringEmissiveIntensity: 3,
    glowEmissiveIntensity: 1.5,
    glowOpacity: 0.7,
    lightIntensity: 6,
  }),
})

export function applyPortalSuctionVisuals({ ringMaterial, glowMaterial, light }) {
  const visual = PORTAL_VISUAL_STATE.sucking

  if (ringMaterial) {
    ringMaterial.color.set(visual.color)
    ringMaterial.emissive.set(visual.color)
    ringMaterial.emissiveIntensity = visual.ringEmissiveIntensity
  }
  if (glowMaterial) {
    glowMaterial.color.set(visual.color)
    glowMaterial.emissive.set(visual.color)
    glowMaterial.emissiveIntensity = visual.glowEmissiveIntensity
    glowMaterial.opacity = visual.glowOpacity
  }
  if (light) {
    light.color.set(visual.color)
    light.intensity = visual.lightIntensity
  }
}
