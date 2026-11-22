// @vitest-environment jsdom
// Terry 2026-11-22 "탈출구 효과는 위로 뻗은 기둥은 삭제": the upward light pillar is gone; the floor swirl, the
// portal ring/glow parts and the portal light that let players find the exit stay.
import { readFileSync } from 'node:fs'
import { URL as NodeURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createEscapePortalVfx } from './EscapePortal.jsx'

const source = readFileSync(new NodeURL('./EscapePortal.jsx', import.meta.url), 'utf8')

describe('escape portal effect without the upward pillar', () => {
  it('builds only the floor swirl material (no pillar shader to compile or draw)', () => {
    const vfx = createEscapePortalVfx()
    expect(Object.keys(vfx).sort()).toEqual(['geometry', 'swirl'])
    expect(vfx.swirl.uniforms.uTime).toBeTruthy()
    vfx.swirl.dispose(); vfx.geometry.dispose()
    expect(source).not.toContain("createReeboMaterial('pillar'")
    expect(source).not.toContain('vfx.pillar')
    expect(source).not.toContain('PORTAL_PILLAR_SCALE')
  })

  it('keeps everything that marks the exit on the floor: swirl, ring, glow, light, suction', () => {
    expect(source).toContain('material={vfx.swirl}')
    expect(source).toContain('vfx.swirl.uniforms.uTime.value = vfxTimeRef.current')
    expect(source).toContain('<ringGeometry args={[PORTAL_RADIUS - 0.12, PORTAL_RADIUS, 48]} />')
    expect(source).toContain('<circleGeometry args={[PORTAL_RADIUS - 0.14, 48]} />')
    expect(source).toContain('name="escape-portal-light-anchor"')
    expect(source).toContain('applyPortalSuctionVisuals')
    // the stage-entry shader prewarm still compiles the swirl so opening the exit does not hitch
    const prewarm = source.slice(source.indexOf('export function EscapePortalShaderPrewarm'), source.indexOf('export function getEscapePortalSceneLightIntensity'))
    expect(prewarm).toContain('material={vfx.swirl}')
    expect(prewarm).not.toContain('pillar')
  })
})
