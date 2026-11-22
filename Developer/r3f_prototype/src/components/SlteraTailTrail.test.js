import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  SLTERA_TRAIL, createSlteraTrailState, sampleSlteraTrail, slteraTrailFade, slteraTrailProfile, slteraTrailSpread, writeSlteraTrailBuffers,
} from './SlteraTailTrail.jsx'

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

  it('blurs like a rear-light streak (Terry 11-22 "끝에 블러"): soft cross-section, fading far end, spreading as it ages', () => {
    // cross-section: bright core in the middle, alpha falls smoothly to 0 at both edges (no hard cel band)
    expect(slteraTrailProfile(0.5)).toEqual([1, 1])
    expect(slteraTrailProfile(0)[1]).toBe(0)
    expect(slteraTrailProfile(1)[1]).toBe(0)
    const mid = slteraTrailProfile(0.85)[1]
    expect(mid).toBeGreaterThan(0); expect(mid).toBeLessThan(1)
    const src = readFileSync(new URL('./SlteraTailTrail.jsx', import.meta.url), 'utf8')
    expect(src).toContain('THREE.LinearFilter')
    expect(src).not.toContain('NearestFilter')

    const st = createSlteraTrailState()
    for (let i = 0; i <= 30; i += 1) sampleSlteraTrail(st, 0, 0.3, i * 0.3, 0, 0.3, true, i / 60)
    const n = SLTERA_TRAIL.maxPoints
    const pos = new Float32Array(n * 6); const col = new Float32Array(n * 8).fill(1)
    const now = 30 / 60
    expect(writeSlteraTrailBuffers(st, pos, col, now)).toBe(30 * 6)
    const alpha = (i) => col[i * 8 + 3]
    const width = (i) => Math.hypot(pos[i * 6] - pos[i * 6 + 3], pos[i * 6 + 2] - pos[i * 6 + 5])
    // the far (oldest) end fades out along its length; the end at the car is at full trail opacity
    expect(alpha(0)).toBe(0)
    for (let i = 1; i <= SLTERA_TRAIL.endBlurPoints; i += 1) expect(alpha(i)).toBeGreaterThanOrEqual(alpha(i - 1))
    expect(alpha(30)).toBeCloseTo(SLTERA_TRAIL.peakOpacity, 6)
    // the ribbon is wider than the light bar (the soft edge sits outside it) and older points spread wider
    expect(width(30)).toBeCloseTo(0.6 * SLTERA_TRAIL.baseSpread, 5)
    expect(width(0)).toBeGreaterThan(width(30))
    expect(slteraTrailSpread(SLTERA_TRAIL.lifeSec)).toBeCloseTo(SLTERA_TRAIL.spreadMax, 6)
    // the light-bar positions themselves are untouched (state keeps the real bar width)
    expect(st.lx[30] - st.rx[30]).toBeCloseTo(0.6, 6)
  })

  it('cleans up: after the dash nothing is drawn once the afterimage expires, and buffers are disposed on unmount', () => {
    const st = createSlteraTrailState()
    for (let i = 0; i <= 20; i += 1) sampleSlteraTrail(st, 0, 0.3, i * 0.3, 0, 0.3, true, i / 60)
    const n = SLTERA_TRAIL.maxPoints
    const pos = new Float32Array(n * 6); const col = new Float32Array(n * 8).fill(1)
    const end = 20 / 60 + SLTERA_TRAIL.lifeSec + 0.01
    sampleSlteraTrail(st, 0, 0.3, 50, 0, 0.3, false, end) // exit over: no new points, old ones expire
    expect(st.count).toBe(0)
    expect(writeSlteraTrailBuffers(st, pos, col, end)).toBe(0)
    const src = readFileSync(new URL('./SlteraTailTrail.jsx', import.meta.url), 'utf8')
    expect(src).toContain('useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])')
    expect(src).toContain('clear() { state.count = 0; geometry.setDrawRange(0, 0) }')
  })
})
