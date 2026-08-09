import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { bikittyBladeShape, bikittyBladeReachMultiplier } from './BikittyCutter.jsx'

describe('BikittyCutterModel blade segments', () => {
  it('grows the blade geometry z length between segment 0 and segment 7', () => {
    const first = bikittyBladeShape(0)
    const last = bikittyBladeShape(7)

    expect(first.length).toBeCloseTo(0.6, 6)
    expect(last.length).toBeCloseTo(1.356, 6)
    expect(last.length).toBeGreaterThan(first.length)
    // 끝점도 함께 밀려나오고, 마지막 단은 날 끝이 최대로 달아오른다.
    expect(last.tipZ).toBeGreaterThan(first.tipZ)
    expect(first.heat).toBe(0)
    expect(last.heat).toBe(1)
    // 8단이 모두 서로 다른 길이로 구분된다.
    const lengths = Array.from({ length: 8 }, (_, i) => bikittyBladeShape(i).length)
    expect(new Set(lengths).size).toBe(8)
    expect(bikittyBladeReachMultiplier(0)).toBeCloseTo(1, 6)
    expect(bikittyBladeReachMultiplier(7)).toBeCloseTo(2.26, 6)
  })

  it('clamps out-of-range segments instead of producing a runaway blade', () => {
    expect(bikittyBladeShape(-3).length).toBe(bikittyBladeShape(0).length)
    expect(bikittyBladeShape(99).length).toBe(bikittyBladeShape(7).length)
  })

  it('keeps the Studio wrapper, outline meshes, and depth defaults intact', () => {
    const source = readFileSync(new URL('./BikittyCutter.jsx', import.meta.url), 'utf8')

    expect(source).toContain('export function BikittyCutterModel')
    expect(source).toContain('<StudioTunedGroup itemId="weapon-bikitty-cutter">')
    // 본체 메시와 아웃라인 메시가 같은 단계 길이를 쓴다.
    expect(source.match(/boxGeometry args=\{\[BLADE_WIDTH, BLADE_THICKNESS, blade\.length\]\}/g))
      .toHaveLength(2)
    // depth를 끄면 JSX 선언 순서가 가림을 결정해 모델이 깨진다(2026-08-09 회귀).
    expect(source).not.toContain('depthTest')
    expect(source).not.toContain('depthWrite')
  })
})
