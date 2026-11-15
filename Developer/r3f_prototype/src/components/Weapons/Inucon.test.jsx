import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { shouldRunInuconSupport } from '../../lib/inucon.js'
import {
  INUCON_COMPANION_SCALE,
  INUCON_GUARD_BARK_TEXT,
  INUCON_GUARD_RING_DURATION_MS,
  INUCON_GUARD_TEXT_DURATION_MS,
  INUCON_PUSH_VFX_DURATION_MS,
  INUCON_PUSH_VFX_RING_RADIUS_MULTIPLIER,
  computeInuconGuardFrame,
  getInuconVisualState,
  selectInuconFainted,
} from './Inucon.jsx'

describe('Inucon companion scale', () => {
  it('renders the runtime companion at twice the previous size', () => {
    expect(INUCON_COMPANION_SCALE).toBe(0.36)
  })

  it('uses the shared scale constant on all axes', () => {
    const source = readFileSync(new URL('./Inucon.jsx', import.meta.url), 'utf8')
    expect(source).toContain('scale={[INUCON_COMPANION_SCALE, INUCON_COMPANION_SCALE, INUCON_COMPANION_SCALE]}')
    expect(source).not.toContain('scale={[0.18, 0.18, 0.18]}')
  })
})

describe('Inucon push VFX', () => {
  it('keeps the push ring radius locked to the actual player-centered push radius', () => {
    expect(INUCON_PUSH_VFX_RING_RADIUS_MULTIPLIER).toBe(1)
    expect(INUCON_PUSH_VFX_DURATION_MS).toBeGreaterThanOrEqual(360)
  })

  it('fires the push VFX only after applyRadialDamage reports real hits', () => {
    const source = readFileSync(new URL('./Inucon.jsx', import.meta.url), 'utf8')
    expect(source).toMatch(/const hits = applyRadialDamage\([\s\S]*?radius: biteDrag\.radius[\s\S]*?if \(hits > 0\) \{[\s\S]*?triggerInuconPushVfx\(biteDrag\.radius\)/)
    expect(source).not.toMatch(/else[\s\S]*?triggerInuconPushVfx/)
  })
})

describe('Inucon fainted ghost visual', () => {
  it('shows a halo with translucent materials only while fainted, read from store inucon.fainted', () => {
    expect(getInuconVisualState(true)).toEqual({ fainted: true, opacity: 0.45, transparent: true, depthWrite: false, halo: true })
    expect(getInuconVisualState(false)).toEqual({ fainted: false, opacity: 1, transparent: false, depthWrite: true, halo: false })
    expect(selectInuconFainted({})).toBe(false)
    expect(selectInuconFainted({ inucon: { fainted: true } })).toBe(true)
    const source = readFileSync(new URL('./Inucon.jsx', import.meta.url), 'utf8')
    expect(source).toMatch(/\{fainted && \([\s\S]*?name="inucon-halo"[\s\S]*?<torusGeometry/)
  })
})

describe('Inucon fainted support gate', () => {
  it('stops push, bite and heal while fainted but keeps following', () => {
    expect(shouldRunInuconSupport(true)).toBe(false)
    expect(shouldRunInuconSupport(false)).toBe(true)
    const source = readFileSync(new URL('./Inucon.jsx', import.meta.url), 'utf8')
    const gate = source.indexOf('if (!shouldRunInuconSupport(fainted))')
    expect(gate).toBeGreaterThan(source.indexOf('posRef.current.lerp('))
    expect(gate).toBeLessThan(source.indexOf('applyRadialDamage({'))
    expect(gate).toBeLessThan(source.indexOf('healPlayer(healAmount)'))
  })
})

// Terry 2026-11-15 "A포즈 했는데 옛 팔이 남은 것 같다": 팔 2·다리 2·꼬리 1, 꼬리는 몸 뒤에서 좌우로 흔든다.
describe('Inucon body parts', () => {
  const source = readFileSync(new URL('./Inucon.jsx', import.meta.url), 'utf8')
  const model = source.slice(source.indexOf('export function InuconModel'), source.indexOf('export const INUCON_COMPANION_SCALE'))

  it('has exactly two arm groups, two legs and one tail, and no leftover pre-A-pose arm', () => {
    expect(model.match(/reg\('arm[LR]'\)/g)).toEqual(["reg('armR')", "reg('armL')"])
    expect(model.match(/reg\('tail'\)/g)).toHaveLength(1)
    expect(model.match(/position=\{\[-?0\.\d+, -0\.34, 0\]\}/g)).toHaveLength(2)
    expect(model).not.toContain('length={0.92}')
    expect(model).not.toContain('position={[-0.33, 0.77')
  })

  it('puts the tail behind the hips and wags it sideways (y axis), not in the front plane', () => {
    const tail = model.match(/<group ref=\{reg\('tail'\)\} position=\{\[([^\]]+)\]\}/)
    const [, y, z] = tail[1].split(',').map(Number)
    expect(z).toBeLessThan(-0.1)
    expect(y).toBeLessThan(0.3)
    expect(model).toMatch(/parts\.current\.tail\.rotation\.y = composeStudioPartRotation\(parts\.current\.tail, 'y'/)
    expect(model).not.toMatch(/parts\.current\.tail\.rotation\.z/)
  })
})

describe('Inucon guard effect', () => {
  it('is a short ring pulse plus a 멍!멍! pop that both end', () => {
    expect(INUCON_GUARD_BARK_TEXT).toBe('멍!멍!')
    expect(INUCON_GUARD_RING_DURATION_MS).toBeLessThanOrEqual(500)
    expect(INUCON_GUARD_TEXT_DURATION_MS).toBeLessThanOrEqual(800)
    const start = computeInuconGuardFrame(0)
    expect(start).toMatchObject({ ringVisible: true, textVisible: true, ringOpacity: 1, textOpacity: 1 })
    const end = computeInuconGuardFrame(INUCON_GUARD_TEXT_DURATION_MS)
    expect(end).toMatchObject({ ringVisible: false, textVisible: false })
  })

  it('uses unlit, non-tone-mapped materials and is wired into the companion', () => {
    const source = readFileSync(new URL('./Inucon.jsx', import.meta.url), 'utf8')
    const effect = source.slice(source.indexOf('function InuconGuardEffect'), source.indexOf('export function InuconWeapon'))
    expect(effect.match(/new THREE\.MeshBasicMaterial\(\{[^}]*toneMapped: false/g)).toHaveLength(2)
    expect(effect).not.toMatch(/Points|Sprite|emissive/)
    expect(effect).toContain('subscribeInuconGuard(')
    expect(source).toContain('<InuconGuardEffect inuconPosRef={posRef} />')
  })
})
