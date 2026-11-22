import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { SLTERA_TRAIL, createSlteraTrailState, sampleSlteraTrail, slteraTrailFade } from './SlteraTailTrail.jsx'

describe('Sltera taillight trail (Terry 11-22: red afterimage during the fast exit)', () => {
  it('records world-space points only while active and keeps them after the car moved on, then drops them', () => {
    const st = createSlteraTrailState()
    sampleSlteraTrail(st, 0, 0.3, 0, 0, 0.3, false, 0)
    expect(st.count).toBe(0) // not dashing → no trail
    for (let i = 0; i <= 30; i += 1) sampleSlteraTrail(st, 0, 0.3, i * 0.3, 0, 0.3, true, i / 60)
    expect(st.count).toBe(31)
    // fixed in the world: the first point stays where the car was, the ribbon is as wide as the light bar
    expect((st.lx[0] + st.rx[0]) / 2).toBeCloseTo(0, 6)
    expect(st.lz[0]).toBeCloseTo(0, 6)
    expect(st.lx[0] - st.rx[0]).toBeCloseTo(0.6, 6)
    // after the dash it lingers, then everything expires
    const end = 30 / 60
    sampleSlteraTrail(st, 0, 0.3, 50, 0, 0.3, false, end + SLTERA_TRAIL.lifeSec * 0.5)
    expect(st.count).toBeGreaterThan(0)
    sampleSlteraTrail(st, 0, 0.3, 50, 0, 0.3, false, end + SLTERA_TRAIL.lifeSec + 0.01)
    expect(st.count).toBe(0)
  })

  it('caps the ring buffer and fades hold-then-out within 0.6-1.0 s', () => {
    const st = createSlteraTrailState()
    for (let i = 0; i < 500; i += 1) sampleSlteraTrail(st, i, 0, 0, Math.PI / 2, 0.3, true, i / 1000)
    expect(st.count).toBe(SLTERA_TRAIL.maxPoints)
    expect(SLTERA_TRAIL.lifeSec).toBeGreaterThanOrEqual(0.6)
    expect(SLTERA_TRAIL.lifeSec).toBeLessThanOrEqual(1)
    expect(slteraTrailFade(0)).toBe(1)
    // semi-transparent at its brightest (Terry 11-22): the floor shows through
    expect(SLTERA_TRAIL.peakOpacity).toBeGreaterThanOrEqual(0.4)
    expect(SLTERA_TRAIL.peakOpacity).toBeLessThanOrEqual(0.55)
    expect(slteraTrailFade(SLTERA_TRAIL.lifeSec * SLTERA_TRAIL.holdFrac)).toBe(1)
    expect(slteraTrailFade(SLTERA_TRAIL.lifeSec)).toBe(0)
  })

  it('is one cheap alpha-faded mesh with no lights, and SlteraEvent feeds it only during the exit dash', () => {
    const src = readFileSync(new URL('./SlteraTailTrail.jsx', import.meta.url), 'utf8')
    expect(src.match(/<mesh /g)).toHaveLength(1)
    expect(src).toContain('transparent: true')
    expect(src).toContain('depthWrite: false')
    expect(src).not.toMatch(/Light\b|pointLight|spotLight/)
    const ev = readFileSync(new URL('./SlteraEvent.jsx', import.meta.url), 'utf8')
    expect(ev).toContain('<SlteraTailTrail ref={trailRef} />')
    expect(ev).toContain('pass.exitDash && pass.phase !== SLTERA_PHASE.DONE')
  })
})
