// Stage 6 B05 교장 「교가 제창」(b05_p2) 타격 몸 연출 곡선(Terry 2026-11-22 "공격순간 보스의 몸 움직임을 좀 넣어").
// 그림만 — 곡선의 정점은 게임 피해 판정이 시작되는 시각(elapsedMs === windupMs)과 정확히 같아야 한다.
import { describe, expect, it } from 'vitest'
import { B05_CHANT_STRIKE, MINI_BOSS_POSES, b05ChantStrikeCurve, b05ChantStrikePose, createB05ChantStrikePose } from './miniBossRoster.js'
import { EXPANSION_BOSSES } from './expansionContent.js'

const chant = EXPANSION_BOSSES.B05.patterns.find((p) => p.id === B05_CHANT_STRIKE.patternId)
const W = chant.windupMs

describe('B05 chant strike body-motion curve', () => {
  it('reads the real b05_p2 timing, which stays as authored (visual-only change)', () => {
    expect(chant).toMatchObject({ windupMs: 1400, activeMs: 350, recoveryMs: 1000, cooldownMs: 9000, rangeUnits: 7, widthUnits: 0.8, damage: 9, shape: 'cross' })
  })

  it('strike peaks exactly at the impact time (elapsedMs === windupMs) and nowhere else', () => {
    let best = -1, bestAt = -1
    for (let e = 0; e <= W + 1200; e += 5) {
      const s = b05ChantStrikeCurve(e, W).strike
      if (s > best) { best = s; bestAt = e }
    }
    expect(bestAt).toBe(W)
    expect(best).toBe(1)
    expect(b05ChantStrikeCurve(W - 10, W).strike).toBeLessThan(1)
    expect(b05ChantStrikeCurve(W + 10, W).strike).toBeLessThan(1)
    // 내려치기는 타격 strikeLeadMs 전에 시작하고, 그 전에는 0(준비 자세).
    expect(b05ChantStrikeCurve(W - B05_CHANT_STRIKE.strikeLeadMs - 1, W).strike).toBe(0)
  })

  it('anticipation builds during the windup; weight eases in from 0 and hands back to 0 after the strike decays', () => {
    const at = (e) => ({ ...b05ChantStrikeCurve(e, W) })
    expect(at(0)).toEqual({ anticipation: 0, strike: 0, weight: 0 })
    expect(at(B05_CHANT_STRIKE.blendInMs).weight).toBe(1)
    expect(at(W * 0.3).anticipation).toBe(0)
    expect(at(W - B05_CHANT_STRIKE.strikeLeadMs).anticipation).toBe(1)
    let prev = 0
    for (let e = 0; e <= W - B05_CHANT_STRIKE.strikeLeadMs; e += 20) { const a = at(e).anticipation; expect(a).toBeGreaterThanOrEqual(prev); prev = a }
    expect(at(W + B05_CHANT_STRIKE.strikeDecayMs)).toEqual({ anticipation: 0, strike: 0, weight: 0 })
    // 감쇠는 피해 창(active 350ms)보다 길다 → 타격 자세가 판정 동안 보인다.
    expect(B05_CHANT_STRIKE.strikeDecayMs).toBeGreaterThan(chant.activeMs)
    expect(at(W + chant.activeMs).strike).toBeGreaterThan(0.5)
  })

  it('pose: windup pose at the start, full strike pose + deepest squash at impact, back to normal at the end', () => {
    const out = createB05ChantStrikePose()
    const P = MINI_BOSS_POSES.B05
    b05ChantStrikePose(0, W, out)
    expect(out.armL).toEqual([...P.warn.armL])
    expect(out.weight).toBe(0)
    b05ChantStrikePose(W - B05_CHANT_STRIKE.strikeLeadMs, W, out)
    for (const k of ['armL', 'armR', 'torso']) out[k].forEach((v, i) => expect(v).toBeCloseTo(P.chantWindup[k][i], 9))
    expect(out.torso[0]).toBeLessThan(0) // 몸을 뒤로 젖힌다
    expect(out.scaleY).toBeGreaterThan(1) // 위로 늘인다
    b05ChantStrikePose(W, W, out)
    for (const k of ['armL', 'armR', 'torso']) out[k].forEach((v, i) => expect(v).toBeCloseTo(P.chantStrike[k][i], 9))
    expect(out.torso[0]).toBeGreaterThan(0.3) // 앞으로 숙인다
    let minY = Infinity, minAt = -1
    for (let e = 0; e <= W + 1000; e += 5) { b05ChantStrikePose(e, W, out); if (out.scaleY < minY) { minY = out.scaleY; minAt = e } }
    expect(minAt).toBe(W)
    expect(minY).toBeCloseTo(1 + B05_CHANT_STRIKE.squashY, 9)
    b05ChantStrikePose(W + B05_CHANT_STRIKE.strikeDecayMs - 1, W, out)
    for (const k of ['armL', 'armR', 'torso']) out[k].forEach((v, i) => expect(v).toBeCloseTo(P.normal[k][i], 3))
  })

  it('fills the given object (no per-frame allocation) and ignores missing timing', () => {
    const out = createB05ChantStrikePose()
    const armL = out.armL
    expect(b05ChantStrikePose(700, W, out)).toBe(out)
    expect(out.armL).toBe(armL)
    expect(b05ChantStrikeCurve(NaN, W)).toEqual({ anticipation: 0, strike: 0, weight: 0 })
    expect(b05ChantStrikeCurve(100, 0)).toEqual({ anticipation: 0, strike: 0, weight: 0 })
  })
})
