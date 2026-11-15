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
  computeEvenOutlineScale,
  INUCON_FACE_Z,
  INUCON_HEAD_FRONT_Z,
  INUCON_FOOT_MODEL_Y,
  INUCON_GROUND_Y,
  INUCON_GHOST_GRADIENT,
  INUCON_GHOST_FIRST_PART_INDICES,
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
    // 2026-11-15: 흰 한 덩어리 유령 — 깊이 기록 + 불투명 큐(CustomBlending으로만 반투명), 안쪽 파츠가 비치지 않는다.
    expect(getInuconVisualState(true)).toEqual({ fainted: true, opacity: 0.72, transparent: false, depthWrite: true, halo: true })
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
  it('is a short shield-shell pulse plus a 멍!멍! pop that both end', () => {
    expect(INUCON_GUARD_BARK_TEXT).toBe('멍!멍!')
    // Terry 2026-11-15 pick: Binbun shell, trial life 0.6 s.
    expect(INUCON_GUARD_RING_DURATION_MS).toBe(600)
    expect(INUCON_GUARD_TEXT_DURATION_MS).toBeLessThanOrEqual(800)
    const start = computeInuconGuardFrame(0)
    expect(start).toMatchObject({ ringVisible: true, textVisible: true, ringOpacity: 1, textOpacity: 1 })
    const end = computeInuconGuardFrame(INUCON_GUARD_TEXT_DURATION_MS)
    expect(end).toMatchObject({ ringVisible: false, textVisible: false })
  })

  it('uses unlit, non-tone-mapped materials and is wired into the companion', () => {
    const source = readFileSync(new URL('./Inucon.jsx', import.meta.url), 'utf8')
    const effect = source.slice(source.indexOf('function InuconGuardEffect'), source.indexOf('export function InuconWeapon'))
    // Text stays a MeshBasicMaterial; the guard shell is the Binbun fresnel ShaderMaterial (toneMapped false inside).
    expect(effect.match(/new THREE\.MeshBasicMaterial\(\{[^}]*toneMapped: false/g)).toHaveLength(1)
    expect(effect).toContain('createBinbunShellMaterial()')
    expect(effect).not.toMatch(/Points|Sprite|emissive/)
    expect(effect).toContain('subscribeInuconGuard(')
    expect(source).toContain('<InuconGuardEffect inuconPosRef={posRef} />')
  })
})

// Terry 2026-11-15 점검 후속: 얼굴·외곽선·목도리·유령·발 높이·스튜디오 배율.
describe('Inucon visual fixes (2026-11-15)', () => {
  const source = readFileSync(new URL('./Inucon.jsx', import.meta.url), 'utf8')
  const model = source.slice(source.indexOf('export function InuconModel'), source.indexOf('export const INUCON_COMPANION_SCALE'))

  it('keeps the face plane flush with the front of the head', () => {
    expect(INUCON_FACE_Z - INUCON_HEAD_FRONT_Z).toBeGreaterThan(0)
    expect(INUCON_FACE_Z - INUCON_HEAD_FRONT_Z).toBeLessThanOrEqual(0.02)
    expect(source).toContain('position={[0, 1.265, INUCON_FACE_Z]}')
    expect(source).not.toContain('position={[0, 1.265, 0.525]}')
  })

  it('gives every part the same outline thickness on every axis', () => {
    // 길쭉한 몸통(0.21×0.75×0.18)과 가는 팔(0.065×0.265×0.065)이 같은 두께를 받는다.
    const thickness = (half, scale) => half.map((h, i) => +(h * (scale[i] - 1)).toFixed(6))
    const body = thickness([0.21, 0.75, 0.18], computeEvenOutlineScale([0.21, 0.75, 0.18]))
    const arm = thickness([0.065, 0.265, 0.065], computeEvenOutlineScale([0.065, 0.265, 0.065]))
    expect(new Set([...body, ...arm]).size).toBe(1)
    // 그룹 scale로 납작하게 누른 축도 월드 두께가 같다.
    const squashed = computeEvenOutlineScale([0.065, 0.265, 0.065], [1, 1, 0.82])
    expect(+(0.065 * 0.82 * (squashed[2] - 1)).toFixed(6)).toBe(body[0])
    expect(model).not.toMatch(/outlineScale=/)
    expect(source.match(/scale=\{outlineScale\}/g)).toHaveLength(3)
  })

  it('centres the scarf on the torso and fits its width', () => {
    const scarf = model.match(/<CapsulePart radius=\{([\d.]+)\} length=\{([\d.]+)\} position=\{\[([^\]]+)\]\} rotation=\{\[0, 0, Math\.PI \/ 2\]\} scale=\{\[([^\]]+)\]\} material=\{scarfMat\}/)
    expect(scarf).not.toBeNull()
    const [radius, length] = [Number(scarf[1]), Number(scarf[2])]
    const [x] = scarf[3].split(',').map(Number)
    const [, sy] = scarf[4].split(',').map(Number)
    expect(x).toBe(-0.02) // 몸통 중심
    const width = (length + radius * 2) * sy
    expect(width).toBeGreaterThanOrEqual(0.42)
    expect(width).toBeLessThanOrEqual(0.48)
  })

  it('draws the ghost bright white with two toon steps, head and body first', () => {
    expect(INUCON_GHOST_GRADIENT).toHaveLength(2)
    INUCON_GHOST_GRADIENT.forEach((hex) => expect(parseInt(hex.slice(1, 3), 16)).toBeGreaterThanOrEqual(0xd0))
    expect(INUCON_GHOST_FIRST_PART_INDICES).toEqual([0, 4])
    expect(source).toContain('m.blending = THREE.CustomBlending')
  })

  it('puts the feet on the ground at the lowest bob', () => {
    const lowest = INUCON_GROUND_Y - 0.025 + (INUCON_FOOT_MODEL_Y - 0.035) * INUCON_COMPANION_SCALE
    expect(lowest).toBeGreaterThanOrEqual(-0.001)
    expect(lowest).toBeLessThan(0.02)
    expect(source).toContain('groupRef.current.position.set(posRef.current.x, INUCON_GROUND_Y + bob, posRef.current.z)')
  })

  it('shows the Studio preview at the same scale as the game', () => {
    const studio = readFileSync(new URL('../GraphicsStudioPreview.jsx', import.meta.url), 'utf8')
    const block = studio.slice(studio.indexOf("if (type === 'inucon')"), studio.indexOf("if (type === 'guidedMissile')"))
    expect(block).toContain('scale={[INUCON_COMPANION_SCALE, INUCON_COMPANION_SCALE, INUCON_COMPANION_SCALE]}')
    expect(block).not.toContain('scale={[0.265')
  })
})
