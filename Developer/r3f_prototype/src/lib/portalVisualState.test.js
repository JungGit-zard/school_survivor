import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PORTAL_VISUAL_STATE, applyPortalSuctionVisuals } from './portalVisualState.js'

function colorChannel() {
  return { value: null, set(value) { this.value = value } }
}

describe('portal visual state', () => {
  it('applies the existing suction color, emission, opacity, and light values imperatively', () => {
    const ringMaterial = { color: colorChannel(), emissive: colorChannel(), emissiveIntensity: 0 }
    const glowMaterial = { color: colorChannel(), emissive: colorChannel(), emissiveIntensity: 0, opacity: 0 }
    const light = { color: colorChannel(), intensity: 0 }

    applyPortalSuctionVisuals({ ringMaterial, glowMaterial, light })

    expect(ringMaterial).toMatchObject({
      color: { value: '#ffffff' },
      emissive: { value: '#ffffff' },
      emissiveIntensity: 3,
    })
    expect(glowMaterial).toMatchObject({
      color: { value: '#ffffff' },
      emissive: { value: '#ffffff' },
      emissiveIntensity: 1.5,
      opacity: 0.7,
    })
    expect(light).toMatchObject({ color: { value: '#ffffff' }, intensity: 6 })
    expect(PORTAL_VISUAL_STATE.idle).toMatchObject({ color: '#00ffcc', glowOpacity: 0.35, lightIntensity: 2.5 })
  })

  it('keeps React state setters out of the frame-driven portal component and wires all visual refs', () => {
    const source = readFileSync(new URL('../components/EscapePortal.jsx', import.meta.url), 'utf8')

    expect(source).not.toMatch(/\buseState\b|\bsetSucking\b/)
    for (const refName of ['ringMaterialRef', 'glowMaterialRef', 'portalLightRef']) {
      expect(source).toContain(`ref={${refName}}`)
    }
  })
})
